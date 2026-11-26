import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTO_MODE_RULE,
  autoModeRuleState,
  disablePonytailBand,
  ensureAutoModeRule,
  removeStatusLine,
  run,
} from "../src/commands/setup";
import { DEFAULT_CONFIG } from "../src/core/config";
import { sessionStart } from "../src/hooks/session-start";
import { git } from "../src/release/git";
import { fakeProject, isolateHome, rm, tempDir } from "./helpers";

let claude: string;
const saved = process.env.CLAUDE_CONFIG_DIR;

beforeEach(() => {
  claude = tempDir("hx claude");
  process.env.CLAUDE_CONFIG_DIR = claude;
});

afterEach(() => {
  if (saved === undefined) Reflect.deleteProperty(process.env, "CLAUDE_CONFIG_DIR");
  else process.env.CLAUDE_CONFIG_DIR = saved;
  rm(claude);
});

const band = () => path.join(claude, ".ponytail-band");

describe("ensureAutoModeRule", () => {
  const settings = () => path.join(claude, "settings.json");
  const read = () => JSON.parse(fs.readFileSync(settings(), "utf8"));

  it("creates settings.json with $defaults and the rule", () => {
    expect(ensureAutoModeRule()).toBe("added");
    expect(read()).toEqual({ autoMode: { allow: ["$defaults", AUTO_MODE_RULE] } });
  });

  it("handles an empty settings.json", () => {
    fs.writeFileSync(settings(), "");
    expect(ensureAutoModeRule()).toBe("added");
    expect(read().autoMode.allow).toEqual(["$defaults", AUTO_MODE_RULE]);
  });

  it("keeps the other keys and rules, and is idempotent", () => {
    fs.writeFileSync(
      settings(),
      JSON.stringify({ model: "opus", autoMode: { allow: ["mine"], deny: ["x"] } }),
    );
    expect(ensureAutoModeRule()).toBe("added");
    expect(ensureAutoModeRule()).toBe("present");
    expect(read()).toEqual({
      model: "opus",
      autoMode: { allow: ["mine", AUTO_MODE_RULE], deny: ["x"] },
    });
  });

  it("replaces an older wording of the rule in place", () => {
    const old = "Running the hx CLI (hx sprint, hx usage) in any project is allowed.";
    fs.writeFileSync(settings(), JSON.stringify({ autoMode: { allow: ["a", old, "b"] } }));
    expect(ensureAutoModeRule()).toBe("added");
    expect(read().autoMode.allow).toEqual(["a", AUTO_MODE_RULE, "b"]);
  });

  it("no longer allows schtasks or hx resume (removed in v0.9.0)", () => {
    expect(AUTO_MODE_RULE).not.toMatch(/schtasks|resume/);
  });

  it("refuses to overwrite an unreadable settings.json", () => {
    fs.writeFileSync(settings(), "{ broken");
    expect(ensureAutoModeRule()).toBe("invalid");
    expect(fs.readFileSync(settings(), "utf8")).toBe("{ broken");
  });

  it.each(["null", "[]", '{"autoMode":[]}', '{"autoMode":{"allow":"x"}}'])(
    "treats valid JSON of the wrong shape as invalid: %s",
    (text) => {
      fs.writeFileSync(settings(), text);
      expect(ensureAutoModeRule()).toBe("invalid");
      expect(autoModeRuleState()).toBe("missing");
      expect(fs.readFileSync(settings(), "utf8")).toBe(text);
    },
  );

  it("does not allow arbitrary hx run commands", () => {
    expect(AUTO_MODE_RULE).toMatch(/hx run is allowed only when the wrapped command/);
  });

  it("allows hx release and hx rollback only on the user's explicit request", () => {
    expect(AUTO_MODE_RULE).toMatch(
      /hx release and hx rollback are allowed only when the user explicitly asked for that release or rollback in this conversation/,
    );
    expect(AUTO_MODE_RULE).toMatch(/never on the agent's own initiative/);
    expect(AUTO_MODE_RULE).toMatch(/relayed by another agent .* does not count/);
  });

  it("upgrades the pre-release rule to the current one, keeping a single copy", () => {
    const old =
      "Running the hx CLI (hx sprint, hx task, hx handoff, hx eval, hx review, hx usage) in any project is allowed: it is the Main Harness sprint tooling the user installed. hx run is allowed only when the wrapped command would be allowed on its own.";
    fs.writeFileSync(settings(), JSON.stringify({ autoMode: { allow: ["$defaults", old] } }));
    expect(autoModeRuleState()).toBe("outdated");
    expect(ensureAutoModeRule()).toBe("added");
    expect(ensureAutoModeRule()).toBe("present");
    expect(read().autoMode.allow).toEqual(["$defaults", AUTO_MODE_RULE]);
    expect(autoModeRuleState()).toBe("current");
  });

  it("drops every older copy, even beside the current rule", () => {
    const older = "Running the hx CLI (hx sprint) in any project is allowed.";
    fs.writeFileSync(
      settings(),
      JSON.stringify({ autoMode: { allow: ["$defaults", AUTO_MODE_RULE, "x", older] } }),
    );
    expect(autoModeRuleState()).toBe("outdated");
    expect(ensureAutoModeRule()).toBe("added");
    expect(read().autoMode.allow).toEqual(["$defaults", AUTO_MODE_RULE, "x"]);
  });
});

describe("removeStatusLine", () => {
  const settings = () => path.join(claude, "settings.json");
  const read = () => JSON.parse(fs.readFileSync(settings(), "utf8"));

  it("removes the old hx statusline, keeping other keys", () => {
    const hx = { type: "command", command: "hx statusline" };
    fs.writeFileSync(settings(), JSON.stringify({ model: "opus", statusLine: hx }));
    expect(removeStatusLine()).toBe(true);
    expect(read()).toEqual({ model: "opus" });
  });

  it("keeps any other status line", () => {
    const mine = { type: "command", command: "my-line" };
    fs.writeFileSync(settings(), JSON.stringify({ statusLine: mine }));
    expect(removeStatusLine()).toBe(false);
    expect(read()).toEqual({ statusLine: mine });
  });

  it("does not touch a missing or unreadable settings.json", () => {
    expect(removeStatusLine()).toBe(false);
    expect(fs.existsSync(settings())).toBe(false);
    fs.writeFileSync(settings(), "{ broken");
    expect(removeStatusLine()).toBe(false);
    expect(fs.readFileSync(settings(), "utf8")).toBe("{ broken");
  });
});

describe("autoCompactWindow on session start", () => {
  it("follows the effective contextLimit, even with the old 250000 in config.json", () => {
    const env = isolateHome();
    const proj = fakeProject();
    try {
      fs.writeFileSync(
        path.join(env.home, "config.json"),
        JSON.stringify({ contextLimit: 250000 }),
      );
      const file = path.join(proj, ".claude", "settings.json");
      fs.writeFileSync(file, JSON.stringify({ model: "opus", autoCompactWindow: 250000 }));
      sessionStart({ cwd: proj, session_id: "s1", source: "startup" });
      expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({
        model: "opus",
        autoCompactWindow: 140000,
      });
    } finally {
      env.cleanup();
      rm(proj);
    }
  });

  it("does not create a settings.json the project does not have", () => {
    const env = isolateHome();
    const proj = fakeProject();
    try {
      sessionStart({ cwd: proj, session_id: "s1", source: "startup" });
      expect(fs.existsSync(path.join(proj, ".claude", "settings.json"))).toBe(false);
    } finally {
      env.cleanup();
      rm(proj);
    }
  });
});

describe("disablePonytailBand", () => {
  it("writes off and is idempotent, without setx when the user HOME is set", () => {
    const calls: string[][] = [];
    disablePonytailBand(
      (a) => calls.push(a),
      () => true,
    );
    disablePonytailBand(
      (a) => calls.push(a),
      () => true,
    );
    expect(fs.readFileSync(band(), "utf8")).toBe("off");
    expect(calls).toEqual([]);
  });

  it("overwrites another value", () => {
    fs.writeFileSync(band(), "on");
    disablePonytailBand(
      () => {},
      () => true,
    );
    expect(fs.readFileSync(band(), "utf8")).toBe("off");
  });

  it("sets HOME with setx when the user HOME is missing in the registry", () => {
    const calls: string[][] = [];
    disablePonytailBand(
      (a) => calls.push(a),
      () => false,
    );
    expect(calls).toEqual([["HOME", os.homedir()]]);
  });
});

describe("hx setup run: this copy's paths", () => {
  const KEYS = [
    "CLAUDE_PLUGIN_ROOT",
    "HARNESS_CLAUDE_BIN",
    "HARNESS_NO_PATH",
    "HARNESS_REPO",
    "HARNESS_INBOX",
    "HARNESS_STABLE_DIR",
    "HARNESS_HOME",
  ];
  let before: (string | undefined)[];
  let env: ReturnType<typeof isolateHome>;
  let tmp: string;
  let repo: string;
  let stable: string;

  const fakeCopy = (dir: string) => {
    const put = (rel: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    };
    put(".claude-plugin/plugin.json", '{"name":"main-harness","version":"0.1.0"}');
    put(".claude-plugin/marketplace.json", '{"name":"harness-stable"}');
    put("skills-user/attach/SKILL.md", "node C:/harness-stable/cli/dist/hx.js");
    return dir;
  };
  const gitRepo = (dir: string) => {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "feat: initial"]);
  };
  const cfgFile = () => path.join(env.home, "config.json");
  const readCfg = () => JSON.parse(fs.readFileSync(cfgFile(), "utf8"));
  const writeCfg = (v: object) => fs.writeFileSync(cfgFile(), JSON.stringify(v));
  const market = (location?: string) => {
    fs.mkdirSync(path.join(claude, "plugins"), { recursive: true });
    fs.writeFileSync(
      path.join(claude, "plugins", "known_marketplaces.json"),
      JSON.stringify({ "harness-stable": location ? { installLocation: location } : {} }),
    );
  };
  const setup = (args: string[] = []) => {
    const out: string[] = [];
    const push = (...a: unknown[]) => void out.push(a.join(" "));
    const l = vi.spyOn(console, "log").mockImplementation(push);
    const e = vi.spyOn(console, "error").mockImplementation(push);
    try {
      return { code: run(args), out: out.join("\n") };
    } finally {
      l.mockRestore();
      e.mockRestore();
    }
  };
  const notebook = () => ({
    harnessRepo: DEFAULT_CONFIG.harnessRepo,
    inboxDir: DEFAULT_CONFIG.inboxDir,
    stableDir: stable,
    contextLimit: 99000,
    prices: { mine: { input: 1 } },
  });

  beforeEach(() => {
    before = KEYS.map((k) => process.env[k]);
    for (const k of KEYS) Reflect.deleteProperty(process.env, k);
    env = isolateHome();
    tmp = tempDir("hx setup");
    repo = fakeCopy(path.join(tmp, "main harness"));
    gitRepo(repo);
    stable = fakeCopy(path.join(tmp, "stable"));
    const bin = path.join(tmp, "fake-claude.js");
    fs.writeFileSync(bin, "");
    process.env.HARNESS_CLAUDE_BIN = bin;
    process.env.HARNESS_NO_PATH = "1";
    process.env.CLAUDE_PLUGIN_ROOT = repo;
    market();
  }, 60000); // five git processes: slower than the 10 s default when the whole suite runs

  afterEach(() => {
    env.cleanup();
    rm(tmp);
    KEYS.forEach((k, i) => {
      if (before[i] === undefined) Reflect.deleteProperty(process.env, k);
      else process.env[k] = before[i];
    });
  });

  it("creates a missing config with this copy's paths", () => {
    expect(setup().code).toBe(0);
    expect(readCfg()).toMatchObject({
      harnessRepo: repo,
      inboxDir: path.join(repo, "inbox"),
      stableDir: DEFAULT_CONFIG.stableDir,
    });
  });

  it("repoints an old config, keeps the rest, and has nothing to do the second time", () => {
    writeCfg(notebook());
    const first = setup();
    expect(first.out).toContain(repo);
    expect(readCfg()).toEqual({
      ...notebook(),
      harnessRepo: repo,
      inboxDir: path.join(repo, "inbox"),
    });
    const second = setup();
    expect(second.out).toMatch(/em ordem/);
    expect(second.out).not.toMatch(/config\.json/);
  });

  it.each(["stable", "plugin cache", "folder without .git", "other plugin's repo"])(
    "does not take the paths from the %s",
    (kind) => {
      writeCfg(notebook());
      const dir = {
        stable,
        "plugin cache": path.join(claude, "plugins", "cache", "main-harness"),
        "folder without .git": path.join(tmp, "zip"),
        "other plugin's repo": path.join(tmp, "other plugin"),
      }[kind] as string;
      fakeCopy(dir);
      if (kind === "other plugin's repo")
        fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), '{"name":"other"}');
      if (kind !== "folder without .git") fs.mkdirSync(path.join(dir, ".git"), { recursive: true });
      process.env.CLAUDE_PLUGIN_ROOT = dir;
      expect(setup().code).toBe(0);
      expect(readCfg()).toEqual(notebook());
    },
  );

  it("--dry-run writes nothing and only reports what would change", () => {
    writeCfg(notebook());
    const dry = setup(["--dry-run"]);
    expect(dry.out).toContain(repo);
    expect(readCfg()).toEqual(notebook());
    expect(fs.existsSync(path.join(env.home, "bin"))).toBe(false);
    setup();
    const again = setup(["--dry-run"]);
    expect(again.out).toBe("[simulação] Tudo em ordem, nada a mudar.");
  });

  it("excludes the configured stable dir even with HARNESS_STABLE_DIR set", () => {
    writeCfg(notebook());
    fs.mkdirSync(path.join(stable, ".git"));
    process.env.CLAUDE_PLUGIN_ROOT = stable;
    process.env.HARNESS_STABLE_DIR = path.join(tmp, "temporary");
    expect(setup().code).toBe(0);
    expect(readCfg()).toEqual(notebook());
  });

  it.each([[[]], [["--dry-run"]]])("leaves someone else's repo as stable dir alone %j", (args) => {
    git(repo, ["tag", "v0.1.0"]);
    const other = path.join(tmp, "other repo");
    fs.mkdirSync(other);
    fs.writeFileSync(path.join(other, "mine.txt"), "mine");
    gitRepo(other);
    writeCfg({ stableDir: other });
    market(other);
    const r = setup(args);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/não é a cópia estável do harness/);
    expect(git(other, ["branch", "--show-current"])).toBe("main");
    expect(git(other, ["status", "--porcelain"])).toBe("");
    expect(fs.readdirSync(other).sort()).toEqual([".git", "mine.txt"]);
    expect(readCfg()).toEqual({ stableDir: other });
    expect(fs.existsSync(path.join(env.home, "bin"))).toBe(false);
  });

  it("fills an empty stable dir and never moves a valid one", () => {
    git(repo, ["tag", "v0.1.0"]);
    const target = path.join(tmp, "new stable");
    fs.mkdirSync(target);
    writeCfg({ stableDir: target });
    market(target);
    expect(setup().code).toBe(0);
    expect(git(target, ["describe", "--tags"])).toBe("v0.1.0");
    git(repo, ["commit", "-q", "--allow-empty", "-m", "feat: next"]);
    git(repo, ["tag", "v0.2.0"]);
    expect(setup().code).toBe(0);
    expect(git(target, ["describe", "--tags"])).toBe("v0.1.0");
  });

  it.each(["{ broken", "[]", "﻿{}"])("never overwrites an invalid config.json: %j", (text) => {
    fs.writeFileSync(cfgFile(), text);
    const r = setup();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/config\.json.*JSON inválido|JSON inválido.*config\.json/);
    expect(fs.readFileSync(cfgFile(), "utf8")).toBe(text);
  });

  it("explains a folder it cannot write, without a stack", () => {
    const blocker = path.join(tmp, "blocker");
    fs.writeFileSync(blocker, "");
    process.env.HARNESS_HOME = path.join(blocker, "home");
    const r = setup();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/Não consegui acessar .*blocker.*permiss/);
    expect(r.out).not.toMatch(/\n\s+at /);
  });

  it("creates a missing stable dir at the latest tag", () => {
    git(repo, ["tag", "v0.1.0"]);
    const target = path.join(tmp, "new stable");
    writeCfg({ stableDir: target });
    fs.rmSync(path.join(claude, "plugins"), { recursive: true });
    expect(setup(["--dry-run"]).out).toMatch(/v0\.1\.0/);
    expect(fs.existsSync(target)).toBe(false);
    expect(setup().code).toBe(0);
    expect(git(target, ["describe", "--tags"])).toBe("v0.1.0");
  });

  it("says what to run when the stable dir is missing and there is no tag", () => {
    const target = path.join(tmp, "new stable");
    writeCfg({ stableDir: target });
    market(target);
    const r = setup();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/git fetch --tags/);
    expect(fs.existsSync(target)).toBe(false);
  });

  it("warns when the marketplace points somewhere else", () => {
    writeCfg(notebook());
    market(path.join(tmp, "other"));
    expect(setup().out).toMatch(/claude plugin marketplace remove harness-stable/);
    market(stable);
    expect(setup().out).not.toMatch(/marketplace/);
  });
});
