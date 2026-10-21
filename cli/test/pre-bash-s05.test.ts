// pre-bash S05 (B046, B047): git --output, redirects and PowerShell writers follow the pre-edit rule.
import { afterAll, describe, expect, it } from "vitest";
import { classifyCommand } from "../src/hooks/pre-bash";
import { rm, tempDir } from "./helpers";

const STABLE = "C:\\harness-stable";
const root = tempDir("hx s05");
afterAll(() => rm(root));
const run = (cmd: string) => classifyCommand(cmd, root, root, STABLE);

describe("writes to protected files are denied like pre-edit", () => {
  it.each([
    "git diff --output=cli/dist/hx.js",
    "git diff HEAD~1 --output cli/dist/hx.js",
    'git log -p --output="C:/harness-stable/x.patch"',
    "git -C . diff --outp=cli/dist/hx.js",
    "git diff --output=c:\\HARNESS-STABLE\\x",
    "echo x > cli/dist/hx.js",
    "echo x>cli/dist/hx.js",
    "echo x >> cli/dist/hx.js",
    "echo x >| cli/dist/hx.js",
    "echo x 2> cli/dist/hx.js",
    "echo x &> cli/dist/hx.js",
    "echo x >& cli/dist/hx.js",
    'echo x > "CLI\\DIST\\HX.JS"',
    "echo x > c:/Harness-Stable/a.txt",
    "hx run echo x > cli/dist/hx.js",
    "Get-Content a | Out-File cli/dist/hx.js",
    "Out-File -FilePath cli\\dist\\hx.js -InputObject x",
    "Out-File -FilePath:cli\\dist\\hx.js",
    "Set-Content cli/dist/hx.js 1",
    "Set-Content -Path 'cli/dist/hx.js' -Value 1",
    "Set-Content -Path:C:\\harness-stable\\x.json -Value 1",
    "Add-Content -Path cli/dist/hx.js -Value 1",
    "'x' | Add-Content 'C:/harness-stable/b c.txt'",
  ])("denies %s", (cmd) => {
    expect(run(cmd)?.decision).toBe("deny");
  });
});

describe("ordinary writes stay allowed", () => {
  it.each([
    "git diff --output=out.patch",
    "git log --oneline --output out.txt",
    "git diff cli/dist/hx.js",
    "echo x > out.txt",
    "echo x 2>&1",
    "npm test > log.txt 2>&1",
    "echo x > $null",
    "echo x > /dev/null",
    "Out-File -FilePath out.txt",
    "Set-Content -Path notes.md -Value 1",
    "cat cli/dist/hx.js",
    "node cli/dist/hx.js status > out.txt",
  ])("allows %s", (cmd) => {
    expect(run(cmd)).toBeNull();
  });
});
