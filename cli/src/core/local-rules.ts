import * as fs from "node:fs";
import * as path from "node:path";

/** A project prohibition: any of `commands` is denied with `message`. */
export interface LocalRule {
  commands: string[];
  message: string;
}

/** Rules from <projectDir>/.harness/local-rules.json: [{"commands":["ssh","scp"],"message":"..."}]. Missing/invalid file = no rules. */
export function readLocalRules(projectDir: string): LocalRule[] {
  try {
    const j: unknown = JSON.parse(
      fs.readFileSync(path.join(projectDir, ".harness", "local-rules.json"), "utf8"),
    );
    if (!Array.isArray(j)) return [];
    return j.filter(
      (r): r is LocalRule =>
        Array.isArray(r?.commands) &&
        r.commands.every((c: unknown) => typeof c === "string") &&
        typeof r?.message === "string",
    );
  } catch {
    return [];
  }
}
