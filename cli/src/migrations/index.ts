// Registry of project migrations between harness versions (ordered by version).
import * as fs from "node:fs";
import * as path from "node:path";
import { harnessHome } from "../core/paths";
import { runTool } from "../core/proc";

export interface Migration {
  version: string;
  kind: "simple" | "structural";
  description: string;
  /** Applies the change; returns the files touched (relative to the project root or absolute). */
  up(root: string): string[];
  /** Reverts the change (rollback); returns the files touched. */
  down?(root: string): string[];
}

type Run = (cmd: string, args: string[]) => { ok: boolean; out: string };

/** v0.9.0 dropped the scheduled resume (ADR 0011): delete its Windows tasks and pending files. */
export function removeResumeTasks(run: Run = (c, a) => runTool(c, a, 10_000)): string[] {
  const dir = path.join(harnessHome(), "resume");
  // Every scheduled resume left a file here: no folder, no tasks (and tests never reach schtasks).
  if (!fs.existsSync(dir)) return [];
  const { ok, out } = run("schtasks", ["/query", "/fo", "csv", "/nh"]);
  if (!ok) return []; // keep the folder so the next migration run tries again
  // Strict pattern: only the harness's own tasks (prefix + session UUID) are deleted.
  for (const tn of new Set(
    out.match(/MainHarness-Resume-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi),
  ))
    run("schtasks", ["/delete", "/tn", tn, "/f"]);
  fs.rmSync(dir, { recursive: true, force: true });
  return [];
}

export const MIGRATIONS: Migration[] = [
  {
    version: "0.9.0",
    kind: "simple",
    description: "Remove as retomadas agendadas após o limite (tarefas MainHarness-Resume-*).",
    up: () => removeResumeTasks(),
  },
];
