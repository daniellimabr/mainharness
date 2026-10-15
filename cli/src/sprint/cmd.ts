// Shared helpers for sprint commands: --at timestamps, boolean flags and loading a sprint plan.
import * as fs from "node:fs";
import * as path from "node:path";
import { flagStr, type Parsed } from "../core/args";
import { utcStamp } from "../events/emit";
import { parsePlan, planPath, type Plan } from "./index";

/** --at <ISO> (UTC stamp) or now. */
export function atFlag(p: Parsed): string {
  const s = flagStr(p, "at");
  if (!s) return utcStamp();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`data/hora inválida: ${s}`);
  return utcStamp(d);
}

/** Boolean flag that may have swallowed the next positional (--force S01). */
export function boolFlag(p: Parsed, name: string): boolean {
  const v = p.flags[name];
  if (typeof v === "string") p._.push(v);
  return v !== undefined;
}

export function loadPlan(
  root: string,
  sprintId: string,
): { file: string; text: string; plan: Plan } {
  const file = planPath(root, sprintId);
  if (!fs.existsSync(file))
    throw new Error(`plano não encontrado: docs/sprints/${sprintId}-plan.md`);
  const text = fs.readFileSync(file, "utf8");
  return { file, text, plan: parsePlan(text) };
}

export const sprintId = (s: string | undefined) => (s ? s.toUpperCase() : undefined);

/** Writes a NEW file <dir>/<stem>.md (or -2, -3...). Never overwrites. Returns its path. */
export function createNew(dir: string, stem: string, content: string): string {
  for (let n = 1; ; n++) {
    const file = path.join(dir, `${stem}${n > 1 ? `-${n}` : ""}.md`);
    try {
      fs.writeFileSync(file, content, { flag: "wx" });
      return file;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
}
