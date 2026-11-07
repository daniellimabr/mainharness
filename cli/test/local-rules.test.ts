import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readLocalRules } from "../src/core/local-rules";
import { classifyCommand } from "../src/hooks/pre-bash";
import { rm, tempDir } from "./helpers";

const STABLE = "C:\\harness-stable";
const rules = [{ commands: ["ssh", "scp", "sftp", "ssh.exe"], message: "use o wrapper" }];
const run = (c: string) =>
  classifyCommand(c, process.cwd(), process.cwd(), STABLE, new Map(), rules);

describe("local rules in pre-bash", () => {
  it.each([
    "ssh host ls",
    "scp a b:c",
    "sftp host",
    "ssh.exe host",
    "C:\\Windows\\System32\\OpenSSH\\ssh.exe host",
    "cd x && ssh host",
    "echo hi | ssh host",
    'powershell -Command "ssh host"',
    "bash -c 'scp a b'",
  ])("denies %s", (c) => {
    const v = run(c);
    expect(v?.decision).toBe("deny");
    expect(v?.reason).toContain("use o wrapper");
  });

  it.each([
    "python scripts/ssh_vm.py ls",
    "./ssh-vm.ps1 ls",
    'git commit -m "usa ssh"',
    "grep ssh docs/a.md",
    "rg scp .",
    "echo ssh",
  ])("allows %s", (c) => {
    expect(run(c)).toBeNull();
  });
});

describe("readLocalRules", () => {
  const dir = tempDir();
  afterAll(() => rm(dir));
  const write = (s: string) => {
    fs.mkdirSync(path.join(dir, ".harness"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".harness", "local-rules.json"), s);
  };

  it("reads valid rules and skips malformed ones", () => {
    write(JSON.stringify([{ commands: ["ssh"], message: "m" }, { commands: "x" }]));
    expect(readLocalRules(dir)).toEqual([{ commands: ["ssh"], message: "m" }]);
  });

  it("returns [] for invalid JSON or a missing file", () => {
    write("{nope");
    expect(readLocalRules(dir)).toEqual([]);
    expect(readLocalRules(path.join(dir, "absent"))).toEqual([]);
  });
});
