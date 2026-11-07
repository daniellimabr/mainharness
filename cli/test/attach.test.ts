// E2E tests for hx attach and hx skills, in temp folders with spaces.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readEventsIn, REPO_ROOT, rm, runHx, tempDir } from "./helpers";

let base: string;
let home: string;
let pluginDir: string;
let claudeLog: string;
let env: Record<string, string>;

const readJ = (f: string) => JSON.parse(fs.readFileSync(f, "utf8")) as Record<string, unknown>;
const mkProject = (name: string, files: Record<string, string>): string => {
  const dir = path.join(base, name);
  for (const [f, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), c);
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const git = (cwd: string, ...args: string[]) =>
  spawnSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, ...env } });

beforeAll(() => {
  base = tempDir("hx attach");
  home = path.join(base, "harness home");
  claudeLog = path.join(base, "claude calls.log");
  const fakeClaude = path.join(base, "fake claude.js");
  fs.writeFileSync(
    fakeClaude,
    `require("fs").appendFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }) + "\\n");`,
  );
  pluginDir = REPO_ROOT;
  if (!fs.existsSync(path.join(REPO_ROOT, "skills", "optional"))) {
    pluginDir = path.join(base, "fake plugin");
    fs.mkdirSync(path.join(pluginDir, ".claude-plugin"), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "main-harness", version: "0.1.0" }),
    );
    for (const s of ["webapp-testing", "frontend-design"]) {
      fs.mkdirSync(path.join(pluginDir, "skills", "optional", s), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, "skills", "optional", s, "SKILL.md"), `# ${s}\n`);
    }
    fs.cpSync(path.join(REPO_ROOT, "templates"), path.join(pluginDir, "templates"), {
      recursive: true,
    });
  }
  env = {
    HARNESS_HOME: home,
    CLAUDE_PLUGIN_ROOT: pluginDir,
    HARNESS_CLAUDE_BIN: fakeClaude,
    FAKE_CLAUDE_LOG: claudeLog,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
  };
});

afterAll(() => rm(base));

describe("hx attach", () => {
  it("web project: optional skills copied, web true, slug registered, lint and docs created", () => {
    const dir = mkProject("My Web App", {
      "package.json": JSON.stringify({ name: "web", dependencies: { react: "^19.0.0" } }),
    });
    const r = runHx(["attach", dir, "--no-install"], { env });
    expect(r.stderr).toBe("");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Abra um chat novo neste repo para carregar o harness.");

    const hj = readJ(path.join(dir, ".claude", "harness.json"));
    expect(hj).toMatchObject({ project: "my-web-app", name: "My Web App", web: true });
    expect([...(hj.optionalSkills as string[])].sort()).toEqual([
      "frontend-design",
      "webapp-testing",
    ]);

    // not a git repo before: attach creates it on main, ignores node_modules, first commit
    expect(fs.readFileSync(path.join(dir, ".gitignore"), "utf8")).toMatch(/^node_modules\/$/m);
    const git = (...a: string[]) =>
      spawnSync("git", a, { cwd: dir, encoding: "utf8" }).stdout.trim();
    expect(git("branch", "--show-current")).toBe("main");
    expect(git("log", "--format=%s")).toBe("chore: attach Main Harness");
    expect(git("ls-files")).not.toMatch(/node_modules/);
    expect(fs.existsSync(path.join(dir, ".claude", "skills", "webapp-testing", "SKILL.md"))).toBe(
      true,
    );

    // (e) projects.json with a slug without spaces
    const projects = readJ(path.join(home, "projects.json")).projects as Record<string, string>[];
    const entry = projects.find((p) => p.id === "my-web-app");
    expect(entry?.path).toBe(dir);
    expect(entry?.id).not.toMatch(/\s/);

    for (const f of ["docs/backlog.md", "docs/roadmap.md", "docs/adr/.gitkeep", "index.md"])
      expect(fs.existsSync(path.join(dir, f))).toBe(true);
    const claudeMd = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    expect(claudeMd).toContain("## Compact Instructions");
    expect(claudeMd).toContain("my-web-app");
    expect(claudeMd).not.toContain("{{");

    expect(fs.existsSync(path.join(dir, "eslint.config.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(dir, ".prettierrc"))).toBe(true);
    const pkg = readJ(path.join(dir, "package.json"));
    expect(pkg.devDependencies).toHaveProperty("eslint");
    expect(pkg.dependencies).toEqual({ react: "^19.0.0" });

    const calls = fs
      .readFileSync(claudeLog, "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as { cwd: string; args: string[] })
      .filter((c) => path.resolve(c.cwd) === path.resolve(dir));
    expect(calls.map((c) => c.args[2])).toEqual([
      "main-harness@harness-stable",
      "ponytail@ponytail",
      "security-guidance@claude-plugins-official",
    ]);
    expect(calls[0]?.args).toEqual([
      "plugin",
      "install",
      "main-harness@harness-stable",
      "--scope",
      "project",
    ]);

    const starts = readEventsIn(home).filter(
      (e) => e.type === "session.start" && e.project === "my-web-app",
    );
    expect(starts[0]?.data).toEqual({ source: "attach", model: null });

    // hx skills on|off
    const off = runHx(["skills", "off", "webapp-testing"], { cwd: dir, env });
    expect(off.code).toBe(0);
    expect(fs.existsSync(path.join(dir, ".claude", "skills", "webapp-testing"))).toBe(false);
    expect(readJ(path.join(dir, ".claude", "harness.json")).optionalSkills).toEqual([
      "frontend-design",
    ]);
    const list = runHx(["skills"], { cwd: dir, env });
    expect(list.stdout).toMatch(/webapp-testing.*desligada/);
    expect(runHx(["skills", "on", "webapp-testing"], { cwd: dir, env }).code).toBe(0);
    expect(fs.existsSync(path.join(dir, ".claude", "skills", "webapp-testing", "SKILL.md"))).toBe(
      true,
    );
    expect(runHx(["skills", "on", "nao-existe"], { cwd: dir, env }).code).toBe(1);
  }, 180_000); // ~8 hx/git processes: generous so a busy machine does not time out (B062)

  it("non-web project: nothing copied, web false, lint not applied", () => {
    const dir = mkProject("Py Tool", { "main.py": "print('oi')\n" });
    const r = runHx(["attach", dir, "--no-install"], { env });
    expect(r.code).toBe(0);
    const hj = readJ(path.join(dir, ".claude", "harness.json"));
    expect(hj).toMatchObject({ project: "py-tool", web: false, optionalSkills: [] });
    expect(fs.existsSync(path.join(dir, ".claude", "skills"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "package.json"))).toBe(false);
    expect(r.stdout).toContain("lint padrão não se aplica");
  });

  it("git repo with an old CLAUDE.md: backup, plan, exit 3; --approved moves to legacy", () => {
    const dir = mkProject("Old Repo", {
      "CLAUDE.md": "old rules\n",
      ".cursorrules": "x\n",
      "src/app.ts": "export {};\n",
    });
    git(dir, "init", "-q");
    const r = runHx(["attach", dir, "--no-install"], { env });
    expect(r.code).toBe(3);
    expect(r.stdout).toContain("Aprove para continuar (hx attach --approved).");
    expect(git(dir, "tag", "--list", "harness-backup-*").stdout.trim()).toMatch(
      /^harness-backup-\d{8}-\d{4}$/,
    );
    expect(git(dir, "branch", "--list", "harness-backup/*").stdout.trim()).toMatch(
      /harness-backup\/\d{8}-\d{4}$/,
    );
    expect(git(dir, "log", "--format=%s").stdout).toContain(
      "chore: snapshot before harness attach",
    );
    const plan = fs.readFileSync(path.join(dir, "docs", "harness-reorg-plan.md"), "utf8");
    expect(plan).toContain("docs/legacy-harness/CLAUDE.md");
    expect(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8")).toBe("old rules\n");
    expect(fs.existsSync(path.join(dir, ".claude", "harness.json"))).toBe(false);

    const ok = runHx(["attach", dir, "--approved", "--no-install"], { env });
    expect(ok.code).toBe(0);
    expect(fs.readFileSync(path.join(dir, "docs", "legacy-harness", "CLAUDE.md"), "utf8")).toBe(
      "old rules\n",
    );
    expect(fs.existsSync(path.join(dir, "docs", "legacy-harness", ".cursorrules"))).toBe(true);
    expect(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8")).toContain("Compact Instructions");
    expect(fs.existsSync(path.join(dir, ".claude", "harness.json"))).toBe(true);
    expect(fs.readFileSync(path.join(dir, "claude-local.md"), "utf8")).toContain("old rules");
    expect(fs.readFileSync(path.join(dir, ".claude", "local-rules.json"), "utf8")).toContain(
      "deny",
    );
  });

  it("merges .claude/settings.json without losing keys; falls back to enabledPlugins", () => {
    const dir = mkProject("Settings Kept", {
      "README.md": "# x\n",
      ".claude/settings.json": JSON.stringify({
        model: "opus",
        env: { FOO: "1" },
        permissions: { allow: ["Bash(ls)"], deny: ["Bash(rm *)"] },
        enabledPlugins: { "other@market": true },
      }),
    });
    const r = runHx(["attach", dir, "--no-install"], {
      env: { ...env, HARNESS_CLAUDE_BIN: path.join(base, "missing claude.js") },
    });
    expect(r.code).toBe(0);
    const s = readJ(path.join(dir, ".claude", "settings.json")) as Record<
      string,
      Record<string, unknown>
    >;
    expect(s.model).toBe("opus");
    expect(s.env).toEqual({ FOO: "1", ENABLE_STOP_REVIEW: "0", ENABLE_COMMIT_REVIEW: "0" });
    expect(s.permissions?.deny).toEqual(["Bash(rm *)"]);
    expect(s.permissions?.allow).toEqual(["Bash(ls)", "Bash(hx *)", "PowerShell(hx *)"]);
    expect(s.autoCompactWindow).toBe(140000);
    expect(s.enabledPlugins).toEqual({
      "other@market": true,
      "main-harness@harness-stable": true,
      "ponytail@ponytail": true,
      "security-guidance@claude-plugins-official": true,
    });
  });
});
