// Previous-harness reorganization: git backup, written plan, and the approved move to docs/legacy-harness.
import * as fs from "node:fs";
import * as path from "node:path";
import { gitRun } from "../release/git";

export const PLAN_FILE = "docs/harness-reorg-plan.md";
export const LEGACY_DIR = "docs/legacy-harness";

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Tags and branches HEAD (committing a snapshot first when the repo has no commit). */
export function gitBackup(root: string): { tag: string; branch: string } {
  const s = stamp();
  const tag = `harness-backup-${s}`;
  const branch = `harness-backup/${s}`;
  if (gitRun(root, ["rev-parse", "--verify", "HEAD"]).status !== 0) {
    gitRun(root, ["add", "-A"]);
    const c = gitRun(root, ["commit", "-q", "-m", "chore: snapshot before harness attach"]);
    if (c.status !== 0) throw new Error(`git commit falhou: ${c.stderr.trim()}`);
  }
  for (const args of [
    ["tag", tag],
    ["branch", branch],
  ]) {
    const r = gitRun(root, args);
    if (r.status !== 0 && !/already exists/.test(r.stderr))
      throw new Error(`git ${args[0]} falhou: ${r.stderr.trim()}`);
  }
  return { tag, branch };
}

export function writePlan(
  root: string,
  harness: string[],
  creates: string[],
  backup: { tag: string; branch: string } | null,
): string {
  const lines = [
    "# Plano de reorganização do harness anterior",
    "",
    backup
      ? `Backup: tag \`${backup.tag}\` e branch \`${backup.branch}\` no commit atual.`
      : "Backup: o repo não usa git; nenhum backup automático.",
    "",
    `## Será movido para \`${LEGACY_DIR}/\` (caminhos preservados)`,
    "",
    ...harness.map((h) => `- \`${h}\` → \`${LEGACY_DIR}/${h}\``),
    "",
    "## Será criado (se faltar)",
    "",
    ...creates.map((c) => `- \`${c}\``),
    "",
    "Para aprovar: `hx attach --approved`.",
    "",
  ];
  const file = path.join(root, PLAN_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join("\n"));
  return lines.join("\n");
}

/** Moves each harness path into docs/legacy-harness (git mv when tracked, rename otherwise). */
export function moveToLegacy(root: string, harness: string[], useGit: boolean): void {
  for (const rel of harness) {
    const from = path.join(root, rel);
    const to = path.join(root, LEGACY_DIR, rel);
    if (!fs.existsSync(from)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (useGit) gitRun(root, ["mv", "-k", rel, `${LEGACY_DIR}/${rel}`]);
    // Untracked leftovers (or no git): plain copy + remove.
    if (fs.existsSync(from)) {
      fs.cpSync(from, to, { recursive: true });
      fs.rmSync(from, { recursive: true, force: true });
    }
  }
}
