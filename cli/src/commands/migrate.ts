// hx migrate: brings a project's harness files to the installed harness version (up or down).
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "../core/args";
import { logError } from "../core/log";
import { pluginRoot } from "../core/paths";
import { readHarnessJson, resolveProject, writeHarnessJson } from "../core/projects";
import { compareVersions, harnessVersion } from "../core/version";
import { emit } from "../events/emit";
import { MIGRATIONS, type Migration } from "../migrations";
import { gitRun, isGitRepo } from "../release/git";

export interface MigrateResult {
  from: string;
  to: string;
  applied: string[];
  pending: string | null;
}

export interface MigrateOptions {
  commit?: boolean;
  migrations?: Migration[];
  dryRun?: boolean;
}

function writePlan(root: string, m: Migration, from: string, to: string, down: boolean): string {
  const rel = path.join("docs", `harness-migration-${m.version}.md`);
  const text = `# Migração do harness ${m.version} (${down ? "rollback" : "atualização"})

- **De:** ${from}
- **Para:** ${to}
- **Tipo:** estrutural (não aplicada automaticamente)

## O que muda

${m.description}

## Como seguir

1. Revise este plano com o Daniel.
2. Aplique as mudanças descritas (ou peça ao Tech Lead).
3. Atualize \`.claude/harness.json\` → \`version\` e rode \`hx migrate\` de novo.
`;
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
  return rel;
}

/** Re-copies the optional skills enabled in the project from the installed plugin (ADR 0005). */
function refreshOptionalSkills(root: string, names: string[]): string[] {
  const touched: string[] = [];
  for (const name of names) {
    const src = path.join(pluginRoot(), "skills", "optional", name);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(root, ".claude", "skills", name);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(src, dest, { recursive: true });
    touched.push(dest);
  }
  return touched;
}

export function migrateProject(root: string, opts: MigrateOptions = {}): MigrateResult {
  const hj = readHarnessJson(root);
  if (!hj) throw new Error("projeto sem .claude/harness.json (rode /attach)");
  const from = hj.version;
  const to = harnessVersion();
  const dir = compareVersions(to, from);
  const result: MigrateResult = { from, to, applied: [], pending: null };
  if (dir === 0) return result;

  const down = dir < 0;
  const done = new Set(hj.migrations ?? []);
  const inRange = (opts.migrations ?? MIGRATIONS)
    .filter((m) =>
      down
        ? compareVersions(m.version, to) > 0 && compareVersions(m.version, from) <= 0
        : compareVersions(m.version, from) > 0 &&
          compareVersions(m.version, to) <= 0 &&
          !done.has(m.version),
    )
    .sort((a, b) => (down ? -1 : 1) * compareVersions(a.version, b.version));

  const touched = new Set<string>();
  const event = (kind: Migration["kind"], applied: boolean) => {
    if (opts.dryRun) return;
    try {
      emit({
        type: "harness.migrate",
        project: hj.project,
        session: process.env.HARNESS_SESSION ?? null,
        data: { from, to, kind, applied },
      });
    } catch (err) {
      logError("migrate", err);
    }
  };

  for (const m of inRange) {
    const fn = down ? m.down : m.up;
    if (down && !fn && m.kind === "simple") continue; // nothing to undo
    if (m.kind === "structural" && (!down || !fn)) {
      result.pending = m.version;
      if (!opts.dryRun) writePlan(root, m, from, to, down);
      event("structural", false);
      break;
    }
    result.applied.push(m.version);
    if (opts.dryRun || !fn) continue;
    for (const f of fn(root)) touched.add(path.resolve(root, f));
    if (down) done.delete(m.version);
    else done.add(m.version);
    event(m.kind, true);
  }
  if (opts.dryRun) return result;
  if (!result.applied.length && !result.pending) event("simple", true);

  if (!result.pending) {
    hj.version = to;
    for (const f of refreshOptionalSkills(root, hj.optionalSkills ?? [])) touched.add(f);
  }
  if (result.pending === null || result.applied.length) {
    hj.migrations = [...done].sort(compareVersions);
    writeHarnessJson(root, hj);
    touched.add(path.join(root, ".claude", "harness.json"));
  }

  if ((opts.commit ?? isGitRepo(root)) && touched.size) {
    const files = [...touched]
      .map((f) => path.relative(root, f))
      .filter(
        (f) => fs.existsSync(path.join(root, f)) || gitRun(root, ["ls-files", "--", f]).stdout,
      );
    const add = gitRun(root, ["add", "-A", "--", ...files]);
    const msg = `chore(harness): migrate to v${result.pending ? result.applied.at(-1) : to}`;
    const commit =
      add.status === 0 ? gitRun(root, ["commit", "-q", "-m", msg, "--", ...files]) : add;
    if (commit.status !== 0) logError("migrate commit", commit.stderr || commit.stdout);
  }
  return result;
}

export function run(args: string[]): number {
  const p = parseArgs(args);
  const dryRun = p.flags["dry-run"] === true;
  const proj = resolveProject(process.cwd());
  if (!proj) {
    console.error("Este repo não está conectado ao harness (rode /attach).");
    return 1;
  }
  const r = migrateProject(proj.root, { dryRun });
  if (r.from === r.to) {
    console.log(`Projeto já está na versão ${r.to}. Nada a migrar.`);
    return 0;
  }
  const verb = dryRun ? "Aplicaria" : "Aplicadas";
  console.log(`Migração ${r.from} → ${r.to}${dryRun ? " (simulação)" : ""}`);
  console.log(`${verb}: ${r.applied.length ? r.applied.join(", ") : "nenhuma (só versão)"}`);
  if (r.pending) {
    console.log(
      `Migração estrutural ${r.pending} precisa de aprovação: veja docs/harness-migration-${r.pending}.md`,
    );
    return 3;
  }
  return 0;
}
