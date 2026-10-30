// pre-bash B136: command traps that cost quota produce warnings (never blocks).
import { describe, expect, it } from "vitest";
import { classifyCommand, commandWarnings, preBash } from "../src/hooks/pre-bash";

describe("commandWarnings", () => {
  it.each([
    ["Set-Content -Path a.md -Value x -Encoding utf8", "Set-Content"],
    ["'x' | Out-File a.md -Encoding UTF8", "Set-Content"],
    ["[IO.File]::WriteAllText('a','b')", ".NET"],
    ["[System.IO.File]::ReadAllText('a')", ".NET"],
    ["[IO.Path]::GetTempPath()", ".NET"],
    ["hx task --help", "--help"],
    ["hx --help", "--help"],
    ["hx run npx vitest 2>&1", "2>&1"],
    ["git status 2>&1", "2>&1"],
    ["npm test 2>&1", "2>&1"],
    ["hx task list | Select-Object -First 5", "Select-Object"],
  ])("warns on %s", (cmd, frag) => {
    const w = commandWarnings(cmd);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain(frag);
  });

  it.each([
    "",
    "   ",
    "git status",
    "hx task list",
    "Set-Content a.md x",
    "ls | Select-Object -First 3",
  ])("clean: %j", (cmd) => {
    expect(commandWarnings(cmd)).toEqual([]);
  });

  it("joins several traps", () => {
    expect(commandWarnings("hx --help 2>&1 | Select-Object -First 3")).toHaveLength(3);
  });

  it("handles undefined", () => {
    expect(commandWarnings(undefined)).toEqual([]);
  });
});

describe("preBash output", () => {
  it("allows with additionalContext", () => {
    const out = JSON.stringify(preBash({ tool_input: { command: "git status 2>&1" }, cwd: "." }));
    expect(out).toContain("additionalContext");
    expect(out).not.toContain("permissionDecision");
  });

  it("clean command: no output", () => {
    expect(preBash({ tool_input: { command: "git status" }, cwd: "." })).toEqual({});
  });

  it("still denies", () => {
    expect(classifyCommand("git push --force", ".", ".", "C:\\harness-stable")?.decision).toBe(
      "deny",
    );
  });
});
