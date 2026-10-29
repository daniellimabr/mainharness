// PostToolUse(Write|Edit|MultiEdit): keeps index.md current, formats and lints the edited file.
import * as fs from "node:fs";
import * as path from "node:path";
import { isInside, writeFileAtomic } from "../core/fsx";
import { resolveProject } from "../core/projects";
import { lintFile } from "../lint/index";
import { ensureIndexEntry, isSkipped } from "../repomap/index";
import type { HookInput, HookOutcome } from "./runner";

/** Drops "## Arquivos" entries of index.md whose file is gone or points outside the project. */
function pruneIndex(root: string): void {
  try {
    const idx = path.join(root, "index.md");
    const text = fs.readFileSync(idx, "utf8");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    let inFiles = false;
    const lines = text.split(/\r?\n/).filter((l) => {
      if (l.startsWith("## ")) inFiles = l.trim() === "## Arquivos";
      const rel = inFiles ? /^- `([^`]+)`/.exec(l)?.[1] : undefined;
      if (rel === undefined) return true;
      const abs = path.resolve(root, rel);
      return !path.isAbsolute(rel) && isInside(abs, root) && fs.existsSync(abs);
    });
    if (lines.join(eol) !== text) writeFileAtomic(idx, lines.join(eol));
  } catch {
    // a broken or missing index.md must never block the hook
  }
}

export async function postEdit(input: HookInput): Promise<HookOutcome> {
  const raw = input.tool_input?.file_path;
  if (typeof raw !== "string" || !raw) return {};
  const cwd = input.cwd || process.cwd();
  const root = resolveProject(cwd)?.root ?? cwd;
  const file = path.resolve(cwd, raw);
  if (!isInside(file, root) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return {};
  if (isSkipped(path.relative(root, file).split(path.sep).join("/"))) return {};
  ensureIndexEntry(root, file);
  pruneIndex(root);
  const problems = await lintFile(root, file);
  if (!problems.length) return {};
  return { exitCode: 2, stderr: `${problems.join("\n")}\nCorrija antes de seguir.\n` };
}
