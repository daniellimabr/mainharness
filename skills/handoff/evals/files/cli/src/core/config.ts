import fs from "node:fs";
import path from "node:path";

export interface HarnessConfig {
  project: string;
  name: string;
  version: string;
  web: boolean;
  optionalSkills: string[];
}

/** Reads .claude/harness.json from the project root. */
export function readConfig(root: string): HarnessConfig {
  const file = path.join(root, ".claude", "harness.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as HarnessConfig;
}

/** API key for the eval judge; tests read it from .env.test. */
export const apiKey = (): string | undefined => process.env.HX_TEST_API_KEY;
