// Skill eval gate: every skill changed since the last release needs passing evals/results.json
// stamped with the current hash of the skill (all files except evals/).
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { readJson, writeJson } from "../core/fsx";
import { git, versionTags } from "./git";

export interface SkillResults {
  skill: string;
  skillSha256: string;
  date: string;
  passed: boolean;
  trigger?: { passed: number; total: number };
  evals?: { passed: number; total: number };
  notes?: string;
}

function walk(dir: string, base = dir, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(base, p).split(path.sep).join("/");
    if (rel === "evals" || rel.startsWith("evals/")) continue;
    if (e.isDirectory()) walk(p, base, out);
    else out.push(rel);
  }
  return out;
}

/** Hash of a skill folder (sorted relative paths + content, LF-normalized text), evals/ excluded. */
export function skillHash(dir: string): string {
  const h = createHash("sha256");
  for (const rel of walk(dir).sort()) {
    const buf = fs.readFileSync(path.join(dir, rel));
    h.update(rel + "\0");
    h.update(buf.includes(0) ? buf : Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n")));
    h.update("\0");
  }
  return h.digest("hex");
}

/** Skill folders (holding SKILL.md) under skills/, including skills/optional/*. */
export function listSkills(repo: string): string[] {
  const root = path.join(repo, "skills");
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = path.join(root, e.name);
    if (fs.existsSync(path.join(dir, "SKILL.md"))) out.push(`skills/${e.name}`);
    else
      for (const s of fs.readdirSync(dir, { withFileTypes: true }))
        if (s.isDirectory() && fs.existsSync(path.join(dir, s.name, "SKILL.md")))
          out.push(`skills/${e.name}/${s.name}`);
  }
  return out.sort();
}

/** Skills whose files changed since `sinceTag` (all skills when there is no previous tag). */
export function changedSkills(repo: string, sinceTag: string | null): string[] {
  const all = listSkills(repo);
  if (!sinceTag) return all;
  const changed = git(repo, ["diff", "--name-only", sinceTag, "HEAD", "--", "skills"], true)
    .split("\n")
    .filter(Boolean);
  return all.filter((s) =>
    changed.some((f) => f.startsWith(s + "/") && !f.startsWith(s + "/evals/")),
  );
}

export interface SkillGate {
  skill: string;
  ok: boolean;
  reason: string;
}

export interface EvalScope {
  trigger: boolean;
  evals: boolean;
  isNew: boolean;
}

const lf = (s: string) => s.replace(/\r\n/g, "\n");
const frontmatter = (s: string) => /^---\n[\s\S]*?\n---\n?/.exec(s)?.[0] ?? "";

/**
 * What a skill change since `sinceTag` (working tree) requires: description (frontmatter) changed
 * -> trigger; body or any other file outside evals/ changed -> cases; new skill -> both + baseline.
 */
export function evalScope(repo: string, skill: string, sinceTag: string | null): EvalScope {
  const md = `${skill}/SKILL.md`;
  if (!sinceTag || !git(repo, ["ls-tree", "--name-only", sinceTag, "--", md], true))
    return { trigger: true, evals: true, isNew: true };
  const cur = lf(fs.readFileSync(path.join(repo, md), "utf8"));
  const prev = lf(git(repo, ["show", `${sinceTag}:${md}`], true));
  const others = git(repo, ["diff", "--name-only", sinceTag, "--", skill], true)
    .split("\n")
    .some((f) => f && f !== md && !f.startsWith(`${skill}/evals/`));
  const body = (s: string) => s.slice(frontmatter(s).length).trim();
  return {
    trigger: frontmatter(cur).trim() !== frontmatter(prev).trim(),
    evals: others || body(cur) !== body(prev),
    isNew: false,
  };
}

/** Gate: results.json passed, stamped with the current hash, holding the block the scope demands. */
export function checkSkills(
  repo: string,
  skills: string[],
  sinceTag = versionTags(repo).pop() ?? null,
): SkillGate[] {
  return skills.map((skill) => {
    const dir = path.join(repo, skill);
    const res = readJson<SkillResults | null>(path.join(dir, "evals", "results.json"), null);
    if (!res) return { skill, ok: false, reason: "sem evals/results.json" };
    if (!res.passed) return { skill, ok: false, reason: "evals não passaram" };
    if (res.skillSha256 !== skillHash(dir))
      return { skill, ok: false, reason: "skill mudou depois dos evals" };
    const need = evalScope(repo, skill, sinceTag);
    if (need.trigger && !res.trigger)
      return { skill, ok: false, reason: "falta o eval de acionamento (descrição mudou)" };
    if (need.evals && !res.evals)
      return { skill, ok: false, reason: "faltam os casos de eval (corpo mudou)" };
    return { skill, ok: true, reason: "ok" };
  });
}

/** Records eval results for a skill, stamped with its current hash. */
export function stampSkill(
  repo: string,
  skill: string,
  data: Omit<SkillResults, "skill" | "skillSha256" | "date">,
): SkillResults {
  const dir = path.join(repo, skill);
  if (!fs.existsSync(path.join(dir, "SKILL.md"))) throw new Error(`skill não encontrada: ${skill}`);
  const res: SkillResults = {
    skill: path.basename(dir),
    skillSha256: skillHash(dir),
    date: new Date().toISOString(),
    ...data,
  };
  writeJson(path.join(dir, "evals", "results.json"), res);
  return res;
}
