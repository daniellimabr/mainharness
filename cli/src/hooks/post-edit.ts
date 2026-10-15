// PostToolUse(Write|Edit|MultiEdit): keeps index.md current, formats and lints the edited file.
import * as fs from "node:fs";
import * as path from "node:path";
import { isInside } from "../core/fsx";
import { resolveProject } from "../core/projects";
import { lintFile } from "../lint/index";
import { ensureIndexEntry, isSkipped } from "../repomap/index";
import type { HookInput, HookOutcome } from "./runner";

export async function postEdit(input: HookInput): Promise<HookOutcome> {
  const raw = input.tool_input?.file_path;
  if (typeof raw !== "string" || !raw) return {};
  const cwd = input.cwd || process.cwd();
  const root = resolveProject(cwd)?.root ?? cwd;
  const file = path.resolve(cwd, raw);
  if (!isInside(file, root) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return {};
  if (isSkipped(path.relative(root, file).split(path.sep).join("/"))) return {};
  ensureIndexEntry(root, file);
  const problems = await lintFile(root, file);
  if (!problems.length) return {};
  return { exitCode: 2, stderr: `${problems.join("\n")}\nCorrija antes de seguir.\n` };
}
