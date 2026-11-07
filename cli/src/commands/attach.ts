// hx attach [dir] [--approved] [--no-install] [--no-plugins]: connects a repo to the harness.
import * as fs from "node:fs";
import * as path from "node:path";
import { classify, hasPreviousHarness } from "../attach/classify";
import { LEGACY_DIR, gitBackup, moveToLegacy, writePlan } from "../attach/reorg";
import { isGitRepo } from "../release/git";
import { enableSkill, isWebProject, listCatalog } from "../attach/skills";
import { createIfMissing, installPlugins, mergeSettings, render, setupLint } from "../attach/setup";
import { parseArgs } from "../core/args";
import { loadConfig } from "../core/config";
import { readJson } from "../core/fsx";
import { type LocalRule, readLocalRules } from "../core/local-rules";
import { readHarnessJson, registerProject, slugify, writeHarnessJson } from "../core/projects";
import { harnessVersion } from "../core/version";
import { git as gitRun } from "../release/git";
import { emit, utcStamp } from "../events/emit";
import { buildRepoMap } from "../repomap/index";
import { runDoctor } from "./doctor";

const CREATES = [
  "docs/backlog.md",
  "docs/roadmap.md",
  "docs/adr/",
  "docs/prd/",
  "docs/sprints/",
  "CLAUDE.md",
  "index.md",
  ".claude/harness.json",
  ".claude/settings.json",
];

const PROHIBITION = /\b(nunca|não|proib\w*|never|don'?t|do not|forbidden)\b/i;
const COMMAND = /`([a-z][\w-]*)`|\b(ssh|scp|sftp)\b/gi;

/** shortcut: a prohibition line naming `commands` (backticked or ssh/scp/sftp) becomes one rule; smarter parsing is for the Tech Lead. */
function extractRules(text: string): LocalRule[] {
  const rules: LocalRule[] = [];
  for (const line of text.split("\n")) {
    if (!PROHIBITION.test(line)) continue;
    const commands = [
      ...new Set([...line.matchAll(COMMAND)].map((m) => (m[1] ?? m[2] ?? "").toLowerCase())),
    ];
    if (commands.length) rules.push({ commands, message: line.replace(/^[\s>*-]+/, "").trim() });
  }
  return rules;
}

/**
 * A moved legacy CLAUDE.md/AGENTS.md keeps its rules alive: copied verbatim into claude-local.md, prohibitions
 * migrated to .harness/local-rules.json, context docs copied to docs/contexto/. Never overwrites (clashes are
 * listed as "Conflito"); a rerun changes nothing. Returns the report lines.
 */
function preserveLegacy(root: string, docs: string[]): string[] {
  const legacy = ["CLAUDE.md", "AGENTS.md"]
    .map((f) => path.join(root, LEGACY_DIR, f))
    .filter((f) => fs.existsSync(f));
  if (!legacy.length) return [];
  const texts = legacy.map((f) => fs.readFileSync(f, "utf8"));
  const body = legacy
    .map((f, i) => `## Do ${path.basename(f)} legado\n\n${texts[i]?.trim()}`)
    .join("\n\n");
  createIfMissing(
    path.join(root, "claude-local.md"),
    `# Regras locais do projeto\n\nCopiadas do harness anterior (original em ${LEGACY_DIR}/). O Tech Lead lê este arquivo todo início de sessão; Daniel decide o que conflita com o Main Harness.\n\n${body}\n`,
  );

  const conflicts: string[] = [];
  const rulesFile = path.join(root, ".harness", "local-rules.json");
  let current: LocalRule[] = [];
  let writable = true;
  if (fs.existsSync(rulesFile)) {
    current = readLocalRules(root);
    try {
      writable = Array.isArray(JSON.parse(fs.readFileSync(rulesFile, "utf8")));
    } catch {
      writable = false;
    }
    if (!writable)
      conflicts.push(".harness/local-rules.json ilegível; regras do legado não migradas");
  }
  const added: LocalRule[] = [];
  for (const r of texts.flatMap(extractRules)) {
    const commands = r.commands.filter((c) => {
      const hit = [...current, ...added].find((x) => x.commands.includes(c));
      if (hit && hit.message !== r.message)
        conflicts.push(
          `regra de "${c}" já existe (mantida: "${hit.message}"; legado: "${r.message}")`,
        );
      return !hit;
    });
    if (commands.length && writable) added.push({ commands, message: r.message });
  }
  if (added.length) {
    fs.mkdirSync(path.dirname(rulesFile), { recursive: true });
    fs.writeFileSync(rulesFile, JSON.stringify([...current, ...added], null, 2) + "\n");
  }

  let copied = 0;
  for (const d of docs) {
    if (!/\.md$/i.test(d) || /^(readme|claude|agents|gemini|index)\b/i.test(d) || d.includes("/"))
      continue;
    const to = path.join(root, "docs", "contexto", d);
    const src = fs.readFileSync(path.join(root, d), "utf8");
    if (!fs.existsSync(to)) {
      createIfMissing(to, src);
      copied++;
    } else if (fs.readFileSync(to, "utf8") !== src)
      conflicts.push(`docs/contexto/${d} já existe e difere de ${d} (nada copiado)`);
  }
  return [
    `Legado: Regras migradas: ${added.length}; documentos copiados para docs/contexto/: ${copied}; originais mantidos.`,
    ...conflicts.map((c) => `Conflito (Daniel decide): ${c}`),
  ];
}

/** index.md from the repo map; the bare template if the map fails. */
function indexMd(root: string, vars: Record<string, string>): string {
  try {
    return buildRepoMap(root);
  } catch {
    return render("index.md", { ...vars, map: "" });
  }
}

export function run(args: string[]): number {
  const p = parseArgs(args);
  const root = path.resolve(p._[0] ?? process.cwd());
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`hx attach: pasta não encontrada: ${root}`);
    return 1;
  }
  const approved = p.flags.approved === true;

  // 1. Classify.
  const c = classify(root);
  const show = (label: string, xs: string[]) =>
    console.log(`${label} (${xs.length}): ${xs.join(", ") || "—"}`);
  show("Harness", c.harness);
  show("Documentação", c.docs);
  show("Sistema", c.system);

  // 2. Previous harness: backup + plan, or move when approved.
  const git = isGitRepo(root);
  if (hasPreviousHarness(root, c)) {
    if (!approved) {
      const backup = git ? gitBackup(root) : null;
      console.log("\n" + writePlan(root, c.harness, CREATES, backup));
      console.log(
        "Plano de reorganização em docs/harness-reorg-plan.md. Aprove para continuar (hx attach --approved).",
      );
      return 3;
    }
    moveToLegacy(root, c.harness, git);
    console.log(`Harness anterior movido para docs/legacy-harness/ (${c.harness.length} itens).`);
  }

  // Git: one commit per task needs a repo; a new one gets an initial commit at the end.
  if (!git) gitRun(root, ["init", "-q", "-b", "main"]);
  const ignore = path.join(root, ".gitignore");
  const ignored = fs.existsSync(ignore) ? fs.readFileSync(ignore, "utf8") : "";
  if (!/^\/?node_modules\/?$/m.test(ignored))
    fs.appendFileSync(ignore, `${ignored && !ignored.endsWith("\n") ? "\n" : ""}node_modules/\n`);

  // 3. Project registration.
  const name = path.basename(root);
  const prev = readHarnessJson(root);
  const id = prev?.project ?? slugify(name);
  const version = harnessVersion();
  const attachedAt = prev?.attachedAt ?? utcStamp();
  registerProject({ id, name, path: root, version, attachedAt });

  // 7. Optional catalog (before harness.json so the record is written once).
  const pkg = readJson<Record<string, unknown> | null>(path.join(root, "package.json"), null);
  const web = isWebProject(root, pkg);
  // A re-attach keeps the choices made with hx skills on|off.
  const catalog = listCatalog();
  const optionalSkills = prev?.optionalSkills ?? (web ? catalog : []);
  for (const s of optionalSkills) if (catalog.includes(s)) enableSkill(root, s);
  writeHarnessJson(root, {
    project: id,
    name,
    version,
    attachedAt,
    web,
    optionalSkills,
    migrations: prev?.migrations ?? [],
  });

  // 4. Docs and templates.
  const vars = { project: id, name, version, date: utcStamp().slice(0, 10) };
  createIfMissing(path.join(root, "docs", "backlog.md"), render("backlog.md", vars));
  createIfMissing(path.join(root, "docs", "roadmap.md"), render("roadmap.md", vars));
  for (const d of ["adr", "prd", "sprints"])
    createIfMissing(path.join(root, "docs", d, ".gitkeep"), "");
  createIfMissing(path.join(root, "CLAUDE.md"), render("CLAUDE.md", vars));
  const legacyReport = preserveLegacy(root, c.docs);

  // 5. Lint. 6. Settings and plugins.
  const lintMsg = setupLint(root, p.flags["no-install"] !== true);
  mergeSettings(root, loadConfig().contextLimit);
  const pluginMsg =
    p.flags["no-plugins"] === true ? "plugins: pulados (--no-plugins)." : installPlugins(root);

  // index.md last, so the map lists what attach created.
  createIfMissing(path.join(root, "index.md"), indexMd(root, vars));

  let gitMsg = "git: repositório existente (nada commitado pelo attach).";
  if (!git) {
    try {
      gitRun(root, ["add", "-A"]);
      gitRun(root, ["commit", "-q", "-m", "chore: attach Main Harness"]);
      gitMsg = "git: repositório criado na main, com o primeiro commit.";
    } catch (e) {
      gitMsg = `git: repositório criado na main; primeiro commit falhou (${(e as Error).message}).`;
    }
  }

  // 8. Doctor (non fatal) and session.start.
  let doctorMsg: string;
  try {
    const d = runDoctor({ projectRoot: root });
    const bad = d.lines.filter((l) => !l.startsWith("✓"));
    doctorMsg = d.ok ? "doctor: ok." : `doctor: atenção\n  ${bad.join("\n  ")}`;
  } catch {
    doctorMsg = "doctor: falhou (não impede o attach).";
  }
  emit({ type: "session.start", project: id, data: { source: "attach", model: null } });

  console.log(
    [
      "",
      `Projeto ${name} (${id}) conectado ao harness v${version}.`,
      web
        ? `Projeto web: skills opcionais ligadas (${optionalSkills.join(", ") || "catálogo vazio"}).`
        : "Projeto não web: sem skills opcionais.",
      lintMsg,
      pluginMsg,
      gitMsg,
      doctorMsg,
      ...(legacyReport.length ? ["", ...legacyReport] : []),
      "",
      "Próximo passo: Abra um chat novo neste repo para carregar o harness.",
    ].join("\n"),
  );
  return 0;
}
