import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDoctor } from "../src/commands/doctor";
import { hxOnPath } from "../src/core/shim";
import { HX, isolateHome, REPO_ROOT, rm, runHx, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let claude: string;
let proj: string;
const saved = { ...process.env };

const PLUGINS = [
  "main-harness@harness-stable",
  "ponytail@ponytail",
  "security-guidance@claude-plugins-official",
];

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

/** Fake `claude` CLI: logs its args to calls.txt next to it. */
function fakeClaudeBin(dir: string): string {
  const bin = path.join(dir, "fake-claude.js");
  fs.writeFileSync(
    bin,
    `require("fs").appendFileSync(${JSON.stringify(path.join(dir, "calls.txt"))}, JSON.stringify(process.argv.slice(2)) + "\\n"); console.log("2.1.300 (Claude Code)");`,
  );
  return bin;
}

function settings(envVars: Record<string, string>): void {
  writeJson(path.join(proj, ".claude", "settings.json"), {
    enabledPlugins: Object.fromEntries(PLUGINS.map((p) => [p, true])),
    env: envVars,
  });
}

const line = (lines: string[], text: string) => lines.find((l) => l.includes(text)) ?? "";

beforeEach(() => {
  env = isolateHome();
  claude = tempDir("hx claude");
  proj = tempDir("hx proj");
  process.env.CLAUDE_CONFIG_DIR = claude;
  process.env.HARNESS_CLAUDE_BIN = fakeClaudeBin(claude);
  process.env.CLAUDE_PLUGIN_ROOT = REPO_ROOT;
});

afterEach(() => {
  for (const k of ["CLAUDE_CONFIG_DIR", "HARNESS_CLAUDE_BIN", "CLAUDE_PLUGIN_ROOT"]) {
    if (saved[k] === undefined) Reflect.deleteProperty(process.env, k);
    else process.env[k] = saved[k];
  }
  env.cleanup();
  rm(claude);
  rm(proj);
});

describe("runDoctor", () => {
  it("flags a missing marketplace and config", () => {
    const r = runDoctor({ projectRoot: proj });
    expect(r.ok).toBe(false);
    expect(line(r.lines, "harness-stable")).toMatch(/^✗/);
    expect(line(r.lines, "config.json")).toMatch(/^✗/);
    expect(line(r.lines, "Node")).toMatch(/^✓/);
    expect(line(r.lines, "espaço")).toMatch(/^✓/);
    expect(r.lines.at(-1)).toMatch(/problema/);
  });

  it("passes the machine checks when marketplace and plugins are present", () => {
    writeJson(path.join(claude, "plugins", "known_marketplaces.json"), { "harness-stable": {} });
    writeJson(path.join(claude, "plugins", "installed_plugins.json"), {
      version: 2,
      plugins: { "ponytail@ponytail": [{ scope: "user" }] },
    });
    fs.mkdirSync(
      path.join(claude, "plugins", "cache", "claude-plugins-official", "security-guidance"),
      {
        recursive: true,
      },
    );
    writeJson(path.join(env.home, "config.json"), {});
    settings({ ENABLE_STOP_REVIEW: "0", ENABLE_COMMIT_REVIEW: "0" });
    const r = runDoctor({ projectRoot: proj });
    expect(line(r.lines, "marketplace")).toMatch(/^✓/);
    expect(line(r.lines, "ponytail@ponytail disponível")).toMatch(/^✓/);
    expect(line(r.lines, "security-guidance@claude-plugins-official disponível")).toMatch(/^✓/);
    expect(line(r.lines, "ativos no projeto")).toMatch(/^✓/);
    expect(line(r.lines, "ENABLE_STOP_REVIEW")).toMatch(/^✓/);
    expect(line(r.lines, "claude")).toMatch(/^✓/);
  });

  it("flags project settings without the review env vars", () => {
    settings({});
    const r = runDoctor({ projectRoot: proj });
    expect(line(r.lines, "ENABLE_STOP_REVIEW")).toMatch(/^✗/);
    expect(line(r.lines, "ativos no projeto")).toMatch(/^✓/);
  });

  it("only warns about plugins outside a project", () => {
    const outside = tempDir("hx outside");
    const prev = process.cwd();
    process.chdir(outside);
    try {
      const r = runDoctor();
      expect(line(r.lines, "ponytail@ponytail")).toMatch(/^⚠/);
      expect(line(r.lines, "ativos no projeto")).toBe("");
    } finally {
      process.chdir(prev);
      rm(outside);
    }
  });
});

describe("hx setup", () => {
  it("--dry-run changes nothing", () => {
    const r = runHx(["setup", "--dry-run"], {
      env: {
        HARNESS_HOME: env.home,
        CLAUDE_CONFIG_DIR: claude,
        HARNESS_CLAUDE_BIN: process.env.HARNESS_CLAUDE_BIN as string,
      },
    });
    expect(r.code).toBe(0);
    expect(fs.existsSync(path.join(env.home, "config.json"))).toBe(false);
    expect(fs.existsSync(path.join(claude, "calls.txt"))).toBe(false);
    expect(fs.existsSync(path.join(claude, "skills", "attach"))).toBe(false);
  });

  it("creates config, registers the marketplace and installs the attach skill", () => {
    const stable = "C:\\harness stable";
    const r = runHx(["setup"], {
      env: {
        HARNESS_HOME: env.home,
        CLAUDE_CONFIG_DIR: claude,
        HARNESS_CLAUDE_BIN: process.env.HARNESS_CLAUDE_BIN as string,
        HARNESS_STABLE_DIR: stable,
      },
    });
    expect(r.code, r.stderr).toBe(0);
    expect(fs.existsSync(path.join(env.home, "config.json"))).toBe(true);
    const calls = fs.readFileSync(path.join(claude, "calls.txt"), "utf8").trim().split("\n");
    expect(calls.map((c) => JSON.parse(c))).toContainEqual([
      "plugin",
      "marketplace",
      "add",
      stable,
    ]);
    const skill = fs.readFileSync(path.join(claude, "skills", "attach", "SKILL.md"), "utf8");
    expect(skill).toContain('node "C:/harness stable/cli/dist/hx.js" attach');
    expect(skill).toContain("disable-model-invocation: true");
    expect(fs.existsSync(HX)).toBe(true);
    // hx launchers for Git Bash and PowerShell, pointing at the stable bundle
    const sh = fs.readFileSync(path.join(env.home, "bin", "hx"), "utf8");
    expect(sh).toContain('exec node "C:/harness stable/cli/dist/hx.js" "$@"');
    const cmd = fs.readFileSync(path.join(env.home, "bin", "hx.cmd"), "utf8");
    expect(cmd).toContain('@node "C:\\harness stable\\cli\\dist\\hx.js" %*');
    expect(hxOnPath([path.join(env.home, "bin")].join(path.delimiter))).toBe(true);
    expect(hxOnPath(env.home)).toBe(false);
  });

  it("skips the marketplace when already registered", () => {
    writeJson(path.join(claude, "plugins", "known_marketplaces.json"), { "harness-stable": {} });
    const r = runHx(["setup"], {
      env: {
        HARNESS_HOME: env.home,
        CLAUDE_CONFIG_DIR: claude,
        HARNESS_CLAUDE_BIN: process.env.HARNESS_CLAUDE_BIN as string,
      },
    });
    expect(r.code, r.stderr).toBe(0);
    expect(fs.existsSync(path.join(claude, "calls.txt"))).toBe(false);
  });
});
