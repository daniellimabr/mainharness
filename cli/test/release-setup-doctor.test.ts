// T10 (B090, B091): release ignores SNN-release.md; setup and doctor stay quiet about what is fine.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run as doctorRun, runDoctor } from "../src/commands/doctor";
import { run as releaseRun } from "../src/commands/release";
import { run as setupRun } from "../src/commands/setup";
import { git } from "../src/release/git";
import { isolateHome, REPO_ROOT, rm, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let claude: string;
const saved = { ...process.env };
const KEYS = [
  "CLAUDE_CONFIG_DIR",
  "HARNESS_CLAUDE_BIN",
  "CLAUDE_PLUGIN_ROOT",
  "HARNESS_NO_PATH",
  "HARNESS_REPO",
  "HARNESS_STABLE_DIR",
  "HARNESS_RELEASE_CHECK",
];

/** Runs fn and returns what it printed to stdout/stderr. */
function capture(fn: () => unknown): string {
  const out: string[] = [];
  const push = (...a: unknown[]) => void out.push(a.join(" "));
  const l = vi.spyOn(console, "log").mockImplementation(push);
  const e = vi.spyOn(console, "error").mockImplementation(push);
  try {
    fn();
  } finally {
    l.mockRestore();
    e.mockRestore();
  }
  return out.join("\n");
}

beforeEach(() => {
  env = isolateHome();
  claude = tempDir("hx claude");
  process.env.CLAUDE_CONFIG_DIR = claude;
  process.env.HARNESS_NO_PATH = "1";
  process.env.CLAUDE_PLUGIN_ROOT = REPO_ROOT;
  const bin = path.join(claude, "fake-claude.js");
  fs.writeFileSync(bin, 'console.log("2.1.300 (Claude Code)");');
  process.env.HARNESS_CLAUDE_BIN = bin;
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) Reflect.deleteProperty(process.env, k);
    else process.env[k] = saved[k];
  }
  env.cleanup();
  rm(claude);
});

describe("hx release", () => {
  it("does not refuse because of the sprint's SNN-release.md", () => {
    const repo = tempDir("hx harness repo");
    try {
      git(repo, ["init", "-q", "-b", "main"]);
      git(repo, ["config", "user.email", "t@t"]);
      git(repo, ["config", "user.name", "t"]);
      fs.mkdirSync(path.join(repo, ".claude-plugin"));
      fs.writeFileSync(path.join(repo, ".claude-plugin", "plugin.json"), '{"version":"0.0.0"}');
      fs.mkdirSync(path.join(repo, "skills", "adr"), { recursive: true });
      fs.writeFileSync(path.join(repo, "skills", "adr", "SKILL.md"), "---\nname: adr\n---\n");
      git(repo, ["add", "-A"]);
      git(repo, ["commit", "-q", "-m", "feat: initial"]);
      fs.mkdirSync(path.join(repo, "docs", "sprints"), { recursive: true });
      fs.writeFileSync(path.join(repo, "docs", "sprints", "S17-release.md"), "x");
      process.env.HARNESS_REPO = repo;
      process.env.HARNESS_RELEASE_CHECK = "node -e 0";
      // Passes the dirty-tree check and stops at the skill gate (no evals).
      const out = capture(() => expect(releaseRun(["minor"])).toBe(1));
      expect(out).toMatch(/skills\/adr: sem evals/);
      fs.writeFileSync(path.join(repo, "other.txt"), "x");
      expect(() => releaseRun(["minor"])).toThrow(/não commitadas/);
    } finally {
      rm(repo);
    }
  });
});

describe("hx setup", () => {
  it("a repeated run only reports what is new", () => {
    fs.mkdirSync(path.join(claude, "plugins"), { recursive: true });
    fs.writeFileSync(
      path.join(claude, "plugins", "known_marketplaces.json"),
      '{"harness-stable":{}}',
    );
    const first = capture(() => setupRun([]));
    expect(first).toMatch(/config\.json criado/);
    expect(first).toMatch(/instalando a skill \/attach/);
    const second = capture(() => setupRun([]));
    expect(second).not.toMatch(
      /config\.json|marketplace|skill \/attach|ponytail|modo auto|comando hx/,
    );
    expect(second).toMatch(/em ordem/);
  });
});

describe("hx doctor", () => {
  it("does not warn about a space in the project path", () => {
    const proj = tempDir("hx proj");
    try {
      expect(runDoctor({ projectRoot: proj }).lines.join("\n")).not.toMatch(/espaço: o Bash/);
      expect(capture(() => doctorRun([]))).not.toMatch(/No such file or directory/);
    } finally {
      rm(proj);
    }
  });
});
