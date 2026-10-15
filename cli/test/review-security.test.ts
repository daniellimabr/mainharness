// T13 review: security probes for pre-bash and for the project id taken from .claude/harness.json.
// Every gap found in review is fixed; these cases guard against regressions.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { classifyCommand } from "../src/hooks/pre-bash";
import { fakeProject, rm, runHx, tempDir } from "./helpers";

const root = tempDir("hx review root");
const stable = path.join(tempDir("hx review stable"), "harness-stable");
afterAll(() => {
  rm(root);
  rm(path.dirname(stable));
});

const verdict = (cmd: string) => classifyCommand(cmd, root, root, stable)?.decision ?? null;

describe("pre-bash: cases that already work (regression guard)", () => {
  const ok: [string, "deny" | "ask" | null][] = [
    ['powershell -c "Remove-Item -Recurse -Force C:\\Users"', "deny"],
    ["pwsh -Command 'Remove-Item -Recurse ..'", "deny"],
    ["cmd /c rd /s /q C:\\Users", "deny"],
    ["Remove-Item -Force -Recurse C:\\Users", "deny"],
    ["Remove-Item -LiteralPath C:\\Users -Recurse", "deny"],
    ["rm -rf -- ..", "deny"],
    ["\\rm -rf ..", "deny"],
    ["/usr/bin/rm -rf ..", "deny"],
    ['X=/c/Users; rm -rf "$X"', "ask"],
    ["rm -rf $(pwd)/..", "ask"],
    ["cd .. && rm -rf outro", "deny"],
    ["sudo rm -rf /", "deny"],
    ["bash -c 'rm -rf ~'", "deny"],
    ["powershell -NoProfile -File scripts\\build.ps1", null],
    ['bash -lc "npm test"', null],
    ["hx run npm test", null],
    ["find . -name '*.ts' -exec grep -l foo {} +", null],
    ["C:\\Windows\\System32\\cmd.exe /c dir", null],
    [".\\node_modules\\.bin\\eslint .", null],
    ["powershell -ExecutionPolicy Bypass Get-ChildItem", null],
  ];
  for (const [cmd, want] of ok)
    it(`${want ?? "allow"}: ${cmd}`, () => expect(verdict(cmd)).toBe(want));
});

describe("pre-bash: former bypasses, fixed after review T13", () => {
  // bash runs `r\m` as `rm`; baseName() turns the backslash into a path separator -> "m".
  it("escaped command name: r\\m -rf ..", () => expect(verdict("r\\m -rf ..")).toBe("deny"));
  // powershell.exe treats a bare argument list as -Command.
  it("powershell without -c", () =>
    expect(verdict("powershell Remove-Item -Recurse -Force C:\\Users")).toBe("deny"));
  // -EncodedCommand hides the command; at least ask.
  it("powershell -EncodedCommand", () =>
    expect(verdict("powershell -NoProfile -EncodedCommand UgBlAG0AbwB2AGUA")).not.toBeNull());
  // PowerShell accepts unambiguous parameter prefixes (-Co, -Comm).
  it("powershell -Comm (abbreviated -Command)", () =>
    expect(verdict('powershell -Comm "Remove-Item -Recurse C:\\Users"')).toBe("deny"));
  // Target comes from the pipeline, so there is no positional to check.
  it("pipeline into Remove-Item -Recurse", () =>
    expect(verdict("Get-ChildItem C:\\Users | Remove-Item -Recurse -Force")).not.toBeNull());
  // -Path:value is filtered out as a flag.
  it("Remove-Item -Recurse -Path:C:\\Users", () =>
    expect(verdict("Remove-Item -Recurse -Path:C:\\Users")).toBe("deny"));
  // `Bash(hx *)` is auto-allowed and `hx run` executes its arguments with shell: true.
  it("hx run wrapping a destructive command", () =>
    expect(verdict("hx run rm -rf ..")).toBe("deny"));
  it("hx run wrapping a force push", () =>
    expect(verdict('hx run "git push --force origin main"')).toBe("deny"));
  it("xargs rm -rf", () => expect(verdict("echo C:/Users | xargs rm -rf")).not.toBeNull());
  it("find -delete outside the project", () => expect(verdict("find / -delete")).not.toBeNull());
});

describe("project id from .claude/harness.json is used in file paths (review T13)", () => {
  // resolveProject() returns harness.project unvalidated; state/<id>.json, handoffs/<id>/ and the
  // inbox file name are built from it BEFORE emit() validates the slug.
  it("session-start does not write state outside HARNESS_HOME/state", () => {
    const home = tempDir("hx review home");
    const proj = fakeProject("../escaped-state", "Evil");
    try {
      runHx(["hook", "session-start"], {
        cwd: proj,
        stdin: { session_id: "s1", cwd: proj, source: "startup" },
        env: { HARNESS_HOME: home },
      });
      expect(fs.existsSync(path.join(home, "escaped-state.json"))).toBe(false);
    } finally {
      rm(home);
      rm(proj);
    }
  });

  it("hx request does not write outside the inbox", () => {
    const home = tempDir("hx review home");
    const box = tempDir("hx review box");
    const inbox = path.join(box, "inbox");
    const proj = fakeProject("x/../../escaped", "Evil");
    try {
      runHx(["request", "--title", "t", "--need", "n", "--why", "w"], {
        cwd: proj,
        env: { HARNESS_HOME: home, HARNESS_INBOX: inbox },
      });
      const outside = fs.readdirSync(box).filter((f) => f !== "inbox");
      expect(outside).toEqual([]);
    } finally {
      rm(home);
      rm(box);
      rm(proj);
    }
  });
});
