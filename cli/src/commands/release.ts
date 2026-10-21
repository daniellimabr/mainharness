// hx release patch|minor|major: checks, skill eval gate, version bump, CHANGELOG, commit + tag,
// moves the stable clone to the new tag. Also: `hx release check`, `hx release stamp <skill>`.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { updatePlugins } from "../attach/setup";
import { flagStr, parseArgs } from "../core/args";
import { loadConfig } from "../core/config";
import { readJson, samePathKey, writeJson } from "../core/fsx";
import { runTool, which } from "../core/proc";
import { readProjects } from "../core/projects";
import { bumpVersion } from "../core/version";
import { emit } from "../events/emit";
import { git, versionTags } from "../release/git";
import { changedSkills, checkSkills, stampSkill } from "../release/skills";

const PROJECT = "main-harness";

function repoRoot(): string {
  const repo = path.resolve(loadConfig().harnessRepo);
  if (!fs.existsSync(path.join(repo, ".claude-plugin", "plugin.json")))
    throw new Error(`repo do harness não encontrado em ${repo}`);
  return repo;
}

function runChecks(repo: string): void {
  const cmd = process.env.HARNESS_RELEASE_CHECK || "npm run check";
  const r = spawnSync(cmd, { cwd: repo, shell: true, encoding: "utf8" });
  if (r.status !== 0) {
    const tail = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(-25).join("\n");
    throw new Error(`checagens falharam (${cmd}):\n${tail}`);
  }
}

/** Fails the release when `claude plugin validate` rejects the repo (or claude is missing). */
function validatePlugin(repo: string): void {
  if (!which("claude"))
    throw new Error("claude não encontrado no PATH; sem ele não dá para validar o plugin");
  const r = runTool("claude", ["plugin", "validate", repo], 120_000);
  if (!r.ok) throw new Error(`claude plugin validate falhou:\n${r.out}`);
}

function changelogSection(repo: string, version: string, prev: string | null): string {
  const range = prev ? [`${prev}..HEAD`] : [];
  const subjects = git(repo, ["log", "--format=%s", ...range], true)
    .split("\n")
    .filter((s) => s && !s.startsWith("chore(release)"));
  const group = (re: RegExp) => subjects.filter((s) => re.test(s));
  const feats = group(/^feat/);
  const fixes = group(/^fix/);
  const other = subjects.filter((s) => !feats.includes(s) && !fixes.includes(s));
  const block = (title: string, items: string[]) =>
    items.length ? `### ${title}\n\n${items.map((s) => `- ${s}`).join("\n")}\n\n` : "";
  const date = new Date().toISOString().slice(0, 10);
  return `## [${version}] - ${date}\n\n${block("Novidades", feats)}${block("Correções", fixes)}${block("Outros", other)}`;
}

function writeChangelog(repo: string, section: string): void {
  const file = path.join(repo, "CHANGELOG.md");
  const head =
    "# Changelog\n\nVersões do Main Harness (versionamento semântico; `0.y.z` até a 1.0).\n\n";
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : head;
  const i = old.indexOf("## [");
  const next = i < 0 ? old.trimEnd() + "\n\n" + section : old.slice(0, i) + section + old.slice(i);
  fs.writeFileSync(file, next.trimEnd() + "\n");
}

/** Clones the stable dir on first release, then checks out `tag` (detached). */
export function moveStable(repo: string, stable: string, tag: string): void {
  if (samePathKey(repo) === samePathKey(stable))
    throw new Error("stableDir não pode ser o repo do harness");
  if (!fs.existsSync(path.join(stable, ".git"))) {
    fs.mkdirSync(path.dirname(stable), { recursive: true });
    git(path.dirname(stable), ["clone", "-q", repo, stable]);
  }
  if (git(stable, ["status", "--porcelain"]))
    throw new Error(`${stable} tem alterações locais; ninguém deve editar a versão estável`);
  git(stable, ["fetch", "-q", "--tags", "origin"]);
  git(stable, ["checkout", "-q", "--detach", tag]);
}

function release(kind: "patch" | "minor" | "major", skipChecks: boolean): number {
  const repo = repoRoot();
  const cfg = loadConfig();
  if (git(repo, ["status", "--porcelain"]))
    throw new Error("há alterações não commitadas no repo do harness");
  const tags = versionTags(repo);
  const prev = tags[tags.length - 1] ?? null;

  if (!skipChecks) runChecks(repo);
  validatePlugin(repo);
  const gates = checkSkills(repo, changedSkills(repo, prev));
  const bad = gates.filter((g) => !g.ok);
  if (bad.length) {
    console.error("Release recusada: skills alteradas sem evals passando:");
    for (const g of bad) console.error(`  ✗ ${g.skill}: ${g.reason}`);
    return 1;
  }

  const manifestPath = path.join(repo, ".claude-plugin", "plugin.json");
  const manifest = readJson<Record<string, unknown>>(manifestPath, {});
  const version = bumpVersion(String(manifest.version ?? "0.0.0"), kind);
  const tag = `v${version}`;
  manifest.version = version;
  writeJson(manifestPath, manifest);
  writeChangelog(repo, changelogSection(repo, version, prev));

  git(repo, ["add", "-A", "--", ".claude-plugin/plugin.json", "CHANGELOG.md"]);
  git(repo, ["commit", "-q", "-m", `chore(release): ${tag}`]);
  git(repo, ["tag", "-a", tag, "-m", `Main Harness ${tag}`]);
  moveStable(repo, path.resolve(cfg.stableDir), tag);

  emit({
    type: "harness.release",
    project: PROJECT,
    data: { version, tag, previous: prev },
  });
  console.log(`Versão ${tag} publicada.`);
  console.log(`- CHANGELOG atualizado; ${gates.length} skill(s) com evals conferidos.`);
  console.log(`- Versão estável (${cfg.stableDir}) agora em ${tag}. Vale nos chats novos.`);
  console.log(updatePlugins(readProjects().map((p) => p.path)));
  return 0;
}

export function run(args: string[]): number {
  const p = parseArgs(args);
  const [sub, target] = p._;
  if (sub === "check") {
    const repo = repoRoot();
    const tags = versionTags(repo);
    const gates = checkSkills(repo, changedSkills(repo, tags[tags.length - 1] ?? null));
    for (const g of gates) console.log(`${g.ok ? "✓" : "✗"} ${g.skill}: ${g.reason}`);
    if (!gates.length) console.log("Nenhuma skill alterada desde a última versão.");
    return gates.every((g) => g.ok) ? 0 : 1;
  }
  if (sub === "stamp") {
    if (!target)
      throw new Error("uso: hx release stamp <skills/nome> --trigger 15/16 --evals 3/3 [--failed]");
    const frac = (s?: string) => {
      const m = s?.match(/^(\d+)\/(\d+)$/);
      return m ? { passed: Number(m[1]), total: Number(m[2]) } : undefined;
    };
    const res = stampSkill(repoRoot(), target.replace(/\\/g, "/"), {
      passed: !p.flags.failed,
      trigger: frac(flagStr(p, "trigger")),
      evals: frac(flagStr(p, "evals")),
      notes: flagStr(p, "notes"),
    });
    console.log(
      `Resultado gravado: ${target}/evals/results.json (${res.passed ? "passou" : "falhou"})`,
    );
    return 0;
  }
  if (sub === "patch" || sub === "minor" || sub === "major")
    return release(sub, !!p.flags["skip-checks"]);
  console.error("uso: hx release patch|minor|major | check | stamp <skill>");
  return 1;
}
