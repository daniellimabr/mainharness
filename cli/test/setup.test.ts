import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AUTO_MODE_RULE,
  disablePonytailBand,
  ensureAutoModeRule,
  hasAutoModeRule,
  removeStatusLine,
} from "../src/commands/setup";
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

describe("ensureAutoModeRule", () => {
  const settings = () => path.join(claude, "settings.json");
  const read = () => JSON.parse(fs.readFileSync(settings(), "utf8"));

  it("creates settings.json with $defaults and the rule", () => {
    expect(ensureAutoModeRule()).toBe("added");
    expect(read()).toEqual({ autoMode: { allow: ["$defaults", AUTO_MODE_RULE] } });
  });

  it("handles an empty settings.json", () => {
    fs.writeFileSync(settings(), "");
    expect(ensureAutoModeRule()).toBe("added");
    expect(read().autoMode.allow).toEqual(["$defaults", AUTO_MODE_RULE]);
  });

  it("keeps the other keys and rules, and is idempotent", () => {
    fs.writeFileSync(
      settings(),
      JSON.stringify({ model: "opus", autoMode: { allow: ["mine"], deny: ["x"] } }),
    );
    expect(ensureAutoModeRule()).toBe("added");
    expect(ensureAutoModeRule()).toBe("present");
    expect(read()).toEqual({
      model: "opus",
      autoMode: { allow: ["mine", AUTO_MODE_RULE], deny: ["x"] },
    });
  });

  it("refuses to overwrite an unreadable settings.json", () => {
    fs.writeFileSync(settings(), "{ broken");
    expect(ensureAutoModeRule()).toBe("invalid");
    expect(fs.readFileSync(settings(), "utf8")).toBe("{ broken");
  });

  it.each(["null", "[]", '{"autoMode":[]}', '{"autoMode":{"allow":"x"}}'])(
    "treats valid JSON of the wrong shape as invalid: %s",
    (text) => {
      fs.writeFileSync(settings(), text);
      expect(ensureAutoModeRule()).toBe("invalid");
      expect(hasAutoModeRule()).toBe(false);
      expect(fs.readFileSync(settings(), "utf8")).toBe(text);
    },
  );

  it("does not allow arbitrary hx run commands", () => {
    expect(AUTO_MODE_RULE).toMatch(/hx run is allowed only when the wrapped command/);
    expect(AUTO_MODE_RULE).not.toMatch(/hx release/);
  });
});

describe("removeStatusLine", () => {
  const settings = () => path.join(claude, "settings.json");
  const read = () => JSON.parse(fs.readFileSync(settings(), "utf8"));

  it("removes the old hx statusline, keeping other keys", () => {
    const hx = { type: "command", command: "hx statusline" };
    fs.writeFileSync(settings(), JSON.stringify({ model: "opus", statusLine: hx }));
    expect(removeStatusLine()).toBe(true);
    expect(read()).toEqual({ model: "opus" });
  });

  it("keeps any other status line", () => {
    const mine = { type: "command", command: "my-line" };
    fs.writeFileSync(settings(), JSON.stringify({ statusLine: mine }));
    expect(removeStatusLine()).toBe(false);
    expect(read()).toEqual({ statusLine: mine });
  });

  it("does not touch a missing or unreadable settings.json", () => {
    expect(removeStatusLine()).toBe(false);
    expect(fs.existsSync(settings())).toBe(false);
    fs.writeFileSync(settings(), "{ broken");
    expect(removeStatusLine()).toBe(false);
    expect(fs.readFileSync(settings(), "utf8")).toBe("{ broken");
  });
});

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
