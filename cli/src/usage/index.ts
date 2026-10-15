// Usage (tokens and US$) public API: ingest transcripts, current context size, transcript folder.
import * as fs from "node:fs";
import * as path from "node:path";
import { claudeHome } from "../core/paths";
import { type IngestOptions, transcriptSource } from "./transcript";

export { usd, type TranscriptUsage } from "./price";
export {
  currentContextTokens,
  transcriptSource,
  type IngestOptions,
  type UsageSource,
} from "./transcript";

/** Ingests new responses of a session (main + subagents) into `usage` events. */
export function ingestSession(opts: IngestOptions): { events: number } {
  return { events: transcriptSource.ingest(opts).length };
}

/** Claude Code transcript folder of a project (~/.claude/projects/<encoded path>), or null. */
export function transcriptDirFor(projectRoot: string): string | null {
  const base = path.join(claudeHome(), "projects");
  let names: string[];
  try {
    names = fs.readdirSync(base);
  } catch {
    return null;
  }
  const roots = [path.resolve(projectRoot)];
  try {
    roots.push(fs.realpathSync.native(projectRoot));
  } catch {
    // keep the given path only
  }
  for (const root of roots) {
    const want = root.replace(/[^A-Za-z0-9-]/g, "-").toLowerCase();
    const hit = names.find((n) => n.toLowerCase() === want);
    if (hit) return path.join(base, hit);
  }
  return null;
}
