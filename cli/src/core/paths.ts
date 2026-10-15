// Locations used by hx: the local data folder (~/.harness) and the plugin root.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** %USERPROFILE%\.harness, overridable with HARNESS_HOME (tests). */
export function harnessHome(): string {
  return process.env.HARNESS_HOME || path.join(os.homedir(), ".harness");
}

export const home = {
  config: () => path.join(harnessHome(), "config.json"),
  projects: () => path.join(harnessHome(), "projects.json"),
  events: () => path.join(harnessHome(), "events"),
  logs: () => path.join(harnessHome(), "logs"),
  state: () => path.join(harnessHome(), "state"),
  handoffs: (project: string) => path.join(harnessHome(), "handoffs", project),
  usageCache: () => path.join(harnessHome(), "cache", "usage"),
};

let cachedRoot: string | null = null;

/** Plugin root: CLAUDE_PLUGIN_ROOT, or the nearest parent holding .claude-plugin/plugin.json. */
export function pluginRoot(): string {
  if (process.env.CLAUDE_PLUGIN_ROOT) return path.resolve(process.env.CLAUDE_PLUGIN_ROOT);
  if (cachedRoot) return cachedRoot;
  let dir = __dirname;
  for (;;) {
    if (fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json"))) return (cachedRoot = dir);
    const up = path.dirname(dir);
    if (up === dir) throw new Error("plugin root not found");
    dir = up;
  }
}

/** Claude Code data folder (~/.claude), overridable with CLAUDE_CONFIG_DIR. */
export function claudeHome(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}
