// Classifies a repo's top-level content (root + 1 level) into harness, documentation and system.
import * as fs from "node:fs";
import * as path from "node:path";

export interface Classification {
  harness: string[];
  docs: string[];
  system: string[];
}

const IGNORED = new Set(["node_modules", ".git", "dist"]);
const HARNESS_FILES = /^(CLAUDE\.md|AGENTS\.md|GEMINI\.md)$|^\.cursor|^\.windsurf|^\.aider/i;
/** Claude Code's own files that stay in place (not a previous harness). */
const CLAUDE_KEEP = new Set(["settings.json", "settings.local.json", "harness.json"]);

const entries = (dir: string): fs.Dirent[] => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

/** Relative paths use "/" so they read the same in plans and on every OS. */
export function classify(root: string): Classification {
  const out: Classification = { harness: [], docs: [], system: [] };
  for (const e of entries(root)) {
    const name = e.name;
    if (IGNORED.has(name)) continue;
    if (name === ".claude" && e.isDirectory()) {
      for (const c of entries(path.join(root, name)))
        if (!CLAUDE_KEEP.has(c.name)) out.harness.push(`.claude/${c.name}`);
    } else if (name === ".github" && e.isDirectory()) {
      for (const c of entries(path.join(root, name)))
        (c.name === "copilot-instructions.md" ? out.harness : out.system).push(`.github/${c.name}`);
    } else if (HARNESS_FILES.test(name)) out.harness.push(name);
    else if (
      e.isDirectory() &&
      /^(prompts|agents)$/i.test(name) &&
      entries(path.join(root, name)).some((c) => c.name.endsWith(".md"))
    )
      out.harness.push(name);
    else if (name === "docs" || /^readme/i.test(name) || (e.isFile() && name.endsWith(".md")))
      out.docs.push(name);
    else out.system.push(name);
  }
  return out;
}

/** Previous harness = harness content in a repo not yet attached to this harness. */
export function hasPreviousHarness(root: string, c: Classification): boolean {
  return c.harness.length > 0 && !fs.existsSync(path.join(root, ".claude", "harness.json"));
}

const OTHER_CODE = /\.(py|go|rs|java|kt|cs|rb|php|swift|c|cc|cpp|h|hpp|scala|ex|exs|dart|r)$/i;

/** True when the root or its first level holds source code of a non-JS language. */
export function hasOtherLanguage(root: string): boolean {
  for (const e of entries(root)) {
    if (IGNORED.has(e.name) || e.name.startsWith(".")) continue;
    if (e.isFile() && OTHER_CODE.test(e.name)) return true;
    if (e.isDirectory() && entries(path.join(root, e.name)).some((c) => OTHER_CODE.test(c.name)))
      return true;
  }
  return false;
}
