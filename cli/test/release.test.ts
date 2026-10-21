import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { git } from "../src/release/git";
import { skillHash } from "../src/release/skills";
import { readEventsIn, rm, runHx, tempDir } from "./helpers";

let home: string;
let repo: string;
let stableParent: string;
let stable: string;
let env: Record<string, string>;

function write(rel: string, content: string): void {
  const f = path.join(repo, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

function commit(msg: string): void {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", msg]);
}

function stampOk(skill: string): void {
  const dir = path.join(repo, skill);
  write(
    `${skill}/evals/results.json`,
    JSON.stringify({
      skill,
      skillSha256: skillHash(dir),
      date: "2026-10-15",
      passed: true,
      trigger: { passed: 8, total: 8 },
      evals: { passed: 3, total: 3 },
    }),
  );
}

function fakeClaude(js: string): string {
  const f = path.join(stableParent, `fake claude ${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(f, js);
  return f;
}

beforeEach(() => {
  home = tempDir("hx home");
  repo = tempDir("hx harness repo");
  stableParent = tempDir("hx stable parent");
  stable = path.join(stableParent, "harness stable");
  env = {
    HARNESS_HOME: home,
    HARNESS_REPO: repo,
    HARNESS_STABLE_DIR: stable,
    HARNESS_RELEASE_CHECK: "node -e 0",
    HARNESS_CLAUDE_BIN: fakeClaude("process.exit(0)"),
  };
  git(repo, ["init", "-q", "-b", "main"]);
  git(repo, ["config", "user.email", "t@t"]);
  git(repo, ["config", "user.name", "t"]);
  write(".claude-plugin/plugin.json", JSON.stringify({ name: "main-harness", version: "0.0.0" }));
  write("skills/adr/SKILL.md", "---\nname: adr\ndescription: x\n---\nbody\n");
  write("skills/optional/web/SKILL.md", "---\nname: web\ndescription: y\n---\nbody\n");
  commit("feat: initial harness");
});

afterEach(() => {
  for (const d of [home, repo, stableParent]) rm(d);
});

describe("hx release / rollback", () => {
  it("refuses a release when a changed skill has no passing evals", () => {
    const r = runHx(["release", "minor"], { cwd: repo, env });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/skills\/adr: sem evals/);
    expect(r.stderr).toMatch(/skills\/optional\/web/);
    expect(fs.existsSync(stable)).toBe(false);
  });

  it("refuses when the skill changed after its evals", () => {
    stampOk("skills/adr");
    stampOk("skills/optional/web");
    write("skills/adr/SKILL.md", "---\nname: adr\ndescription: x\n---\nchanged\n");
    commit("feat: change adr");
    const r = runHx(["release", "minor"], { cwd: repo, env });
    expect(r.stderr).toMatch(/skills\/adr: skill mudou depois dos evals/);
  });

  it("releases, tags, writes CHANGELOG, moves stable; rollback goes back", () => {
    stampOk("skills/adr");
    stampOk("skills/optional/web");
    commit("test: skill evals");

    const r1 = runHx(["release", "minor"], { cwd: repo, env });
    expect(r1.stderr).toBe("");
    expect(r1.code).toBe(0);
    expect(git(repo, ["tag"])).toBe("v0.1.0");
    expect(
      JSON.parse(fs.readFileSync(path.join(repo, ".claude-plugin/plugin.json"), "utf8")).version,
    ).toBe("0.1.0");
    const changelog = fs.readFileSync(path.join(repo, "CHANGELOG.md"), "utf8");
    expect(changelog).toMatch(/## \[0\.1\.0\]/);
    expect(changelog).toMatch(/feat: initial harness/);
    expect(git(stable, ["describe", "--tags", "--exact-match", "HEAD"])).toBe("v0.1.0");

    // A second release updates the plugin in every attached project (Claude Code caches it per version).
    const proj = path.join(stableParent, "Some Project");
    fs.mkdirSync(proj);
    fs.writeFileSync(
      path.join(home, "projects.json"),
      JSON.stringify({
        projects: [
          { id: "some-project", path: proj },
          { id: "gone", path: path.join(stableParent, "gone") },
        ],
      }),
    );
    const log = path.join(stableParent, "claude.log");
    const fake = path.join(stableParent, "fake claude.js");
    fs.writeFileSync(
      fake,
      `require("fs").appendFileSync(${JSON.stringify(log)}, process.cwd() + " " + process.argv.slice(2).join(" ") + "\\n");`,
    );
    env.HARNESS_CLAUDE_BIN = fake;

    // A second release only checks skills changed since v0.1.0 (none here).
    write("cli.txt", "x");
    commit("fix: something");
    const r2 = runHx(["release", "patch"], { cwd: repo, env });
    expect(r2.code).toBe(0);
    expect(git(stable, ["describe", "--tags", "--exact-match", "HEAD"])).toBe("v0.1.1");
    expect(fs.readFileSync(log, "utf8").trim().split(/\r?\n/)).toEqual([
      expect.stringMatching(/ plugin validate /),
      ...[
        "main-harness@harness-stable",
        "ponytail@ponytail",
        "security-guidance@claude-plugins-official",
      ].map((id) => `${proj} plugin update ${id} --scope project`),
    ]);
    expect(r2.stdout).toContain("plugins atualizados em 1 projeto(s)");
    expect(
      fs.readFileSync(path.join(repo, "CHANGELOG.md"), "utf8").indexOf("[0.1.1]"),
    ).toBeLessThan(fs.readFileSync(path.join(repo, "CHANGELOG.md"), "utf8").indexOf("[0.1.0]"));

    const rb = runHx(["rollback"], { cwd: repo, env });
    expect(rb.code).toBe(0);
    expect(rb.stdout).toMatch(/v0\.1\.1 para v0\.1\.0/);
    expect(git(stable, ["describe", "--tags", "--exact-match", "HEAD"])).toBe("v0.1.0");

    const types = readEventsIn(home).map((e) => e.type);
    expect(types).toEqual(["harness.release", "harness.release", "harness.rollback"]);
  }, 90_000);

  it("stops before publishing when claude plugin validate fails", () => {
    stampOk("skills/adr");
    stampOk("skills/optional/web");
    commit("test: skill evals");
    const args = path.join(stableParent, "validate args.txt");
    env.HARNESS_CLAUDE_BIN = fakeClaude(
      `require("fs").writeFileSync(${JSON.stringify(args)}, process.argv.slice(2).join("|"));` +
        `console.error("bad manifest"); process.exit(1);`,
    );
    const r = runHx(["release", "minor"], { cwd: repo, env });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/claude plugin validate falhou[\s\S]*bad manifest/);
    expect(fs.readFileSync(args, "utf8")).toBe(`plugin|validate|${repo}`);
    expect(fs.existsSync(stable)).toBe(false);
    expect(git(repo, ["tag"])).toBe("");
  });

  it("refuses to release with uncommitted changes", () => {
    write("dirty.txt", "x");
    const r = runHx(["release", "patch"], { cwd: repo, env });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/não commitadas/);
  });

  it("stamp + check report skill status", () => {
    const s = runHx(["release", "stamp", "skills/adr", "--trigger", "15/16", "--evals", "3/3"], {
      cwd: repo,
      env,
    });
    expect(s.code).toBe(0);
    const c = runHx(["release", "check"], { cwd: repo, env });
    expect(c.stdout).toMatch(/✓ skills\/adr/);
    expect(c.stdout).toMatch(/✗ skills\/optional\/web/);
    expect(c.code).toBe(1);
  });
});
