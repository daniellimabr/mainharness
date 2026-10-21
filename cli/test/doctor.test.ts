import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLUGINS as SETUP_PLUGINS, updatePlugins } from "../src/attach/setup";
import { runDoctor } from "../src/commands/doctor";
import { AUTO_MODE_RULE } from "../src/commands/setup";
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
    expect(line(r.lines, "caminhos com espaço")).toMatch(/^✓/);
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

  it("warns when the project path has a space", () => {
    const r = runDoctor({ projectRoot: proj });
    const w = line(r.lines, "No such file or directory");
    expect(w).toMatch(/^⚠ .*espaço/);
    expect(w).toContain("PowerShell");
    expect(w).toContain('cd "');
  });

  it("says nothing about spaces when the project path has none", () => {
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), "hxplain"));
    try {
      const r = runDoctor({ projectRoot: plain });
      expect(line(r.lines, "No such file or directory")).toBe("");
    } finally {
      rm(plain);
    }
  });

  it("warns when the ponytail band flag is not off", () => {
    const homeVarSet = () => true;
    fs.writeFileSync(path.join(claude, ".ponytail-band"), "on");
    const w = line(runDoctor({ projectRoot: proj, homeVarSet }).lines, "painel do ponytail");
    expect(w).toMatch(/^⚠ painel do ponytail ligado: rode hx setup e reinicie o VS Code/);
    expect(w).toContain("/plugin → ponytail → Task board");
    fs.rmSync(path.join(claude, ".ponytail-band"));
    expect(line(runDoctor({ projectRoot: proj, homeVarSet }).lines, "ponytail ligado")).toMatch(
      /^⚠/,
    );
  });

  it("says nothing about the ponytail band when it is off", () => {
    fs.writeFileSync(path.join(claude, ".ponytail-band"), "off");
    const r = runDoctor({ projectRoot: proj, homeVarSet: () => true });
    expect(line(r.lines, "ponytail ligado")).toBe("");
  });

  it("warns when the hx auto mode rule is missing, and passes once it is there", () => {
    expect(line(runDoctor({ projectRoot: proj }).lines, "modo auto")).toMatch(
      /^⚠ .*modo auto.*hx setup/,
    );
    fs.writeFileSync(
      path.join(claude, "settings.json"),
      JSON.stringify({ autoMode: { allow: [AUTO_MODE_RULE] } }),
    );
    expect(line(runDoctor({ projectRoot: proj }).lines, "modo auto")).toMatch(/^✓/);
  });

  it("has no status line check", () => {
    expect(line(runDoctor({ projectRoot: proj }).lines, "status line")).toBe("");
  });

  it("warns when the user HOME is missing in the registry", () => {
    fs.writeFileSync(path.join(claude, ".ponytail-band"), "off");
    const r = runDoctor({ projectRoot: proj, homeVarSet: () => false });
    expect(line(r.lines, "ponytail ligado")).toMatch(/^⚠/);
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

/** Fake marketplaces: each plugin available at `available` version. */
function markets(available: string): void {
  const known: Record<string, unknown> = {};
  for (const id of PLUGINS) {
    const [name = "", market = ""] = id.split("@");
    const loc = path.join(claude, "mk", market);
    known[market] = { installLocation: loc };
    writeJson(path.join(loc, ".claude-plugin", "marketplace.json"), {
      plugins: [{ name, source: `./${name}` }],
    });
    writeJson(path.join(loc, name, ".claude-plugin", "plugin.json"), { version: available });
  }
  writeJson(path.join(claude, "plugins", "known_marketplaces.json"), known);
}

describe("runDoctor companion plugins", () => {
  it("warns about plugins missing or outdated in the project", () => {
    markets("2.0.0");
    writeJson(path.join(claude, "plugins", "installed_plugins.json"), {
      version: 2,
      plugins: {
        "main-harness@harness-stable": [{ scope: "project", projectPath: proj, version: "2.0.0" }],
        "ponytail@ponytail": [{ scope: "project", projectPath: proj, version: "1.0.0" }],
        "security-guidance@claude-plugins-official": [
          { scope: "project", projectPath: path.join(proj, "other"), version: "2.0.0" },
        ],
      },
    });
    const r = runDoctor({ projectRoot: proj });
    expect(line(r.lines, "main-harness@harness-stable 2.0.0 no projeto")).toMatch(/^✓/);
    expect(line(r.lines, "ponytail@ponytail desatualizado")).toMatch(/^⚠.*1\.0\.0.*2\.0\.0/);
    expect(
      line(r.lines, "security-guidance@claude-plugins-official não instalado no projeto"),
    ).toMatch(/^⚠/);
  });

  it("accepts a user-scope install", () => {
    markets("2.0.0");
    writeJson(path.join(claude, "plugins", "installed_plugins.json"), {
      plugins: { "ponytail@ponytail": [{ scope: "user", version: "2.0.0" }] },
    });
    const r = runDoctor({ projectRoot: proj });
    expect(line(r.lines, "ponytail@ponytail 2.0.0 no projeto")).toMatch(/^✓/);
  });
});

describe("updatePlugins", () => {
  it("lists the companion plugins without remember", () => {
    expect(SETUP_PLUGINS).toEqual(PLUGINS);
  });

  it("updates every plugin in every live project", () => {
    const out = updatePlugins([proj, path.join(proj, "gone")]);
    const calls = fs
      .readFileSync(path.join(claude, "calls.txt"), "utf8")
      .trim()
      .split("\n")
      .map((c) => JSON.parse(c) as string[]);
    expect(calls).toEqual(PLUGINS.map((id) => ["plugin", "update", id, "--scope", "project"]));
    expect(out).toContain("1 projeto");
  });
});

describe("hx setup", () => {
  it("--dry-run changes nothing", () => {
    const r = runHx(["setup", "--dry-run"], {
      env: {
        HARNESS_HOME: env.home,
        CLAUDE_CONFIG_DIR: claude,
        HARNESS_CLAUDE_BIN: process.env.HARNESS_CLAUDE_BIN as string,
        HARNESS_NO_PATH: "1",
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
        HARNESS_NO_PATH: "1",
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
        HARNESS_NO_PATH: "1",
      },
    });
    expect(r.code, r.stderr).toBe(0);
    expect(fs.existsSync(path.join(claude, "calls.txt"))).toBe(false);
  });
});
