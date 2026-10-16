import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { disablePonytailBand } from "../src/commands/setup";
import { rm, tempDir } from "./helpers";

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
