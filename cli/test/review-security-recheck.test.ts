// Re-review of T13 fixes: findings from the second review pass, now fixed (regression guard).
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyCommand } from "../src/hooks/pre-bash";

const root = path.join(os.tmpdir(), "hx-recheck-proj");
const stable = path.join(os.tmpdir(), "hx-recheck-stable");
const c = (cmd: string) => classifyCommand(cmd, root, root, stable);

describe("pre-bash recheck: common commands stay allowed", () => {
  it.each([
    "git status",
    "git commit -m 'x; rm -rf /'",
    "npm test",
    "hx run npm test",
    "hx run npx vitest run",
    "powershell -File build.ps1",
    "powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1",
    "find . -name '*.ts' -exec grep -l foo {} \\;",
    "find src -name '*.tmp' -delete",
  ])("%s", (cmd) => {
    expect(c(cmd)).toBeNull();
  });

  // M1: find in the project root counts "." as deleting the root itself.
  it("find . -name '*.pyc' -delete in the project root is not denied", () => {
    expect(c("find . -name '*.pyc' -delete")?.decision).not.toBe("deny");
  });

  it("find -exec rm on matched files in the project root is not denied", () => {
    expect(c("find . -name '*.log' -exec rm {} \\;")?.decision).not.toBe("deny");
  });
});

// M2: PowerShell accepts any prefix of a parameter; only a few abbreviations are known.
describe("pre-bash recheck: abbreviated PowerShell value options", () => {
  it("powershell -Exec Bypass -Command is checked", () => {
    expect(c('powershell -Exec Bypass -Command "Remove-Item -Recurse -Force C:\\"')?.decision).toBe(
      "deny",
    );
  });

  it("pwsh -ep Bypass -c is checked", () => {
    expect(c('pwsh -ep Bypass -c "Remove-Item -Recurse -Force C:\\"')?.decision).toBe("deny");
  });

  it("powershell -Window Hidden -Command is checked", () => {
    expect(
      c('powershell -Window Hidden -Command "Remove-Item -Recurse -Force C:\\"')?.decision,
    ).toBe("deny");
  });
});

// B1: xargs takes the first non-dash word as the command, but option values come first.
describe("pre-bash recheck: xargs with options before rm", () => {
  it("xargs -0 rm -rf asks", () => {
    expect(c("ls | xargs -0 rm -rf")).not.toBeNull();
  });

  it("xargs -n 1 rm -rf asks", () => {
    expect(c("ls | xargs -n 1 rm -rf")).not.toBeNull();
  });

  it("xargs -I {} rm -rf {} asks", () => {
    expect(c("ls | xargs -I {} rm -rf {}")).not.toBeNull();
  });
});

describe("pre-bash recheck 3: guards around ea66275", () => {
  it.each([
    'pwsh -Interactive -c "Remove-Item -Recurse -Force C:\\"',
    'powershell -NoProfile -SomeNewOpt x -Command "Remove-Item -Recurse -Force C:\\"',
    "find .git -name '*.lock' -delete",
    "find / -name '*.tmp' -delete",
  ])("%s is denied", (cmd) => {
    expect(c(cmd)?.decision).toBe("deny");
  });

  it.each(['powershell -NoProfile -Command "npm test"', "find . -name '*.tmp' -print"])(
    "%s stays allowed",
    (cmd) => {
      expect(c(cmd)).toBeNull();
    },
  );
});
