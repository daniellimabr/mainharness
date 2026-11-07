// hx shot with a fake browser (a script that records its args and writes the screenshot file).
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/shot";
import { rm, tempDir } from "./helpers";

let dir: string;
let cwd: string;
let fake: string;
let log: string;
let out: string[];

beforeEach(() => {
  dir = tempDir("hx shot");
  cwd = process.cwd();
  process.chdir(dir);
  log = path.join(dir, "calls.log");
  fake = path.join(dir, "fake chrome.js");
  fs.writeFileSync(
    fake,
    `const a = process.argv.slice(2);
require("fs").appendFileSync(${JSON.stringify(log)}, JSON.stringify(a) + "\\n");
const s = a.find((x) => x.startsWith("--screenshot="));
if (s) require("fs").writeFileSync(s.slice(13), "png");`,
  );
  process.env.HX_CHROME = fake;
  out = [];
  vi.spyOn(console, "log").mockImplementation((m: string) => void out.push(m));
  vi.spyOn(console, "error").mockImplementation((m: string) => void out.push(m));
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.HX_CHROME;
  process.chdir(cwd);
  rm(dir);
});

const calls = () =>
  fs
    .readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as string[]);

describe("hx shot", () => {
  it("takes a light shot into .harness/shots with the default width", () => {
    expect(run(["http://localhost:3000"])).toBe(0);
    const f = path.join(dir, ".harness", "shots", "shot-light.png");
    expect(fs.existsSync(f)).toBe(true);
    expect(out).toEqual([f]);
    const a = calls()[0] as string[];
    expect(a).toContain("--window-size=1280,800");
    expect(a).not.toContain("--force-dark-mode");
  });

  it("both themes: two files, the dark one with the dark flag, custom width and --out", () => {
    expect(run(["http://x.test", "--theme", "both", "--width", "400", "--out", "p/home.png"])).toBe(
      0,
    );
    expect(fs.existsSync(path.join(dir, "p", "home-light.png"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "p", "home-dark.png"))).toBe(true);
    const [light, dark] = calls() as [string[], string[]];
    expect(light).toContain("--window-size=400,800");
    expect(dark).toContain("--force-dark-mode");
    expect(dark).toContain("--blink-settings=preferredColorScheme=1");
  });

  it("turns a local file into a file URL", () => {
    fs.writeFileSync("a b.html", "<p>oi</p>");
    expect(run(["a b.html"])).toBe(0);
    expect((calls()[0] as string[]).at(-1)).toMatch(/^file:\/\/\/.*a%20b\.html$/);
  });

  it("fails clearly without a browser", () => {
    process.env.HX_CHROME = path.join(dir, "nao existe.js");
    expect(run(["http://x.test"])).toBe(1);
    expect(out.join("\n")).toMatch(/HX_CHROME/);
  });

  it("rejects a bad theme", () => {
    expect(run(["http://x.test", "--theme", "blue"])).toBe(1);
  });
});
