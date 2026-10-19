// pre-bash S04: cd to /c/... denied, stale bundle on commit asks, Remove-Item with spaces inside the repo allowed.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { classifyCommand } from "../src/hooks/pre-bash";
import { rm, tempDir } from "./helpers";

const STABLE = "C:\\harness-stable";

describe("B041: cd to an absolute Git Bash drive path", () => {
  const root = tempDir("hx cd");
  afterAll(() => rm(root));
  it.each([
    "cd /c/Main Harness",
    'cd "/c/Main Harness"',
    "cd '/d/Pasta X/src'",
    "cd /mnt/c/x",
    'cd "/mnt/c/Pasta X"',
    "cd /cygdrive/c/x && ls",
  ])("denies %s", (cmd) => {
    const v = classifyCommand(cmd, root, root, STABLE);
    expect(v?.decision).toBe("deny");
    expect(v?.reason).toContain("o cwd já é o projeto");
  });
  it.each(['cd "C:/Pasta X"', "cd src", "cd ..", "cd"])("allows %s", (cmd) => {
    expect(classifyCommand(cmd, root, root, STABLE)).toBeNull();
  });
});

describe("B042: Remove-Item on a quoted path with spaces inside the repo", () => {
  const root = tempDir("Dashboard IA");
  afterAll(() => rm(root));
  it.each([
    `Remove-Item "${root}\\tsconfig.tsbuildinfo"`,
    `Remove-Item -Force "${root}\\tsconfig.tsbuildinfo"`,
    `Remove-Item -Recurse -Force "${root}\\dist"`,
    'Remove-Item ".\\tsconfig.tsbuildinfo"',
  ])("allows %s", (cmd) => {
    expect(classifyCommand(cmd, root, root, STABLE)).toBeNull();
  });
});

describe("B024: git commit with a stale cli/dist/hx.js", () => {
  let repo: string;
  const git = (...a: string[]) => spawnSync("git", ["-C", repo, ...a], { encoding: "utf8" });
  const touch = (rel: string, secs: number) => {
    const f = path.join(repo, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    if (!fs.existsSync(f)) fs.writeFileSync(f, "x");
    fs.utimesSync(f, secs, secs);
  };
  beforeAll(() => {
    repo = tempDir("hx bundle");
    git("init", "-q");
    touch("cli/src/a.ts", 2000);
    touch("cli/dist/hx.js", 1000);
    touch("README.md", 1000);
  });
  afterAll(() => rm(repo));

  it("asks when cli/src is staged and the bundle is older", () => {
    git("add", "cli/src/a.ts");
    const v = classifyCommand('git commit -m "x"', repo, repo, STABLE);
    expect(v?.decision).toBe("ask");
    expect(v?.reason).toContain("bundle desatualizado: rode npm run build");
  });
  it("allows when the bundle is newer", () => {
    touch("cli/dist/hx.js", 3000);
    expect(classifyCommand('git commit -m "x"', repo, repo, STABLE)).toBeNull();
    touch("cli/dist/hx.js", 1000);
  });
  it("allows when no cli/src file is staged", () => {
    git("reset", "-q");
    git("add", "README.md");
    expect(classifyCommand('git commit -m "x"', repo, repo, STABLE)).toBeNull();
  });
  it("allows when there is no cli/dist/hx.js", () => {
    git("add", "cli/src/a.ts");
    fs.rmSync(path.join(repo, "cli", "dist"), { recursive: true });
    expect(classifyCommand('git commit -m "x"', repo, repo, STABLE)).toBeNull();
  });
});
