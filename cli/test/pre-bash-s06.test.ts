// pre-bash S06 (B054): Tee-Object and git format-patch -o follow the pre-edit rule.
import { afterAll, describe, expect, it } from "vitest";
import { classifyCommand } from "../src/hooks/pre-bash";
import { rm, tempDir } from "./helpers";

const STABLE = "C:\\harness-stable";
const root = tempDir("hx s06");
afterAll(() => rm(root));
const run = (cmd: string) => classifyCommand(cmd, root, root, STABLE);

describe("Tee-Object and format-patch to protected paths are denied", () => {
  it.each([
    "Get-Content a | Tee-Object -FilePath cli/dist/hx.js",
    "Get-Content a | Tee-Object -FilePath:cli\\dist\\hx.js",
    "Get-Content a | Tee-Object -Path C:\\harness-stable\\x.txt",
    "Get-Content a | Tee-Object -LiteralPath 'C:/harness-stable/x.txt'",
    "Get-Content a | Tee-Object cli/dist/hx.js",
    "Get-Content a | tee-object -Append -FilePath cli/dist/hx.js",
    "git format-patch -o C:\\harness-stable HEAD~1",
    "git format-patch HEAD~3 -o C:/harness-stable/patches",
    "git format-patch --output-directory C:\\harness-stable HEAD~1",
    "git format-patch --output-directory=C:\\harness-stable\\p HEAD~1",
    "git format-patch -oC:\\harness-stable HEAD~1",
    "git format-patch --output-dir C:\\harness-stable HEAD~1",
    "git -C . format-patch -o c:\\HARNESS-STABLE -1",
  ])("denies %s", (cmd) => {
    expect(run(cmd)?.decision).toBe("deny");
  });
});

describe("common destinations stay allowed", () => {
  it.each([
    "Get-Content a | Tee-Object -FilePath out.txt",
    "Get-Content a | Tee-Object -Variable lines",
    "Get-Content a | Tee-Object log.txt",
    "git format-patch -o patches HEAD~1",
    "git format-patch --output-directory=out/patches -3",
    "git format-patch -1 HEAD",
  ])("allows %s", (cmd) => {
    expect(run(cmd)).toBeNull();
  });
});
