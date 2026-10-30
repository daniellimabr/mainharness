// scripts/bench.mjs: one S12 run (challenge x model) in a temp clone, with a fake claude (HX_CLAUDE_BIN).
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { REPO_ROOT, rm, tempDir } from "./helpers";

const BENCH = path.join(REPO_ROOT, "scripts", "bench.mjs");
const TOKEN = "sk-omni-bench-secret";
const IN = path.join("docs", "experiments", "S12"); // challenges 1 and 2 keep their handoff here
const OUT = path.join("docs", "experiments", "S15");

// Fake claude: echoes the token everywhere it could leak, edits a file, prints the -p json result.
const FAKE = `
const fs = require("node:fs");
const t = process.env.ANTHROPIC_AUTH_TOKEN || "none";
let input = "";
process.stdin.on("data", (d) => (input += d)).on("end", () => {
  if (process.env.FAKE_SLEEP) return void setTimeout(() => {}, 600000);
  const seen = [t, process.argv.slice(2).join(" "), process.env.HARNESS_HOME, input];
  fs.writeFileSync("feature.js", "// " + seen.join("\\n// "));
  process.stderr.write("API Error: 429 Too Many Requests " + t + "\\n");
  console.log(JSON.stringify({
    type: "result", num_turns: 7, total_cost_usd: 0.42, result: "feito " + t,
    usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 1000, cache_creation_input_tokens: 10 },
  }));
});
`;

// Fake npm: logs each call; lint fails; test writes a vitest json report (1 pass per file, else 3).
const NPM = `
const fs = require("node:fs");
const a = process.argv.slice(2);
fs.appendFileSync(__dirname + "/npm.log", a.join(" ") + "\\n");
if (a[1] === "lint") process.exit(1);
if (a[0] === "test") {
  const out = a.find((x) => x.startsWith("--outputFile=")).slice("--outputFile=".length);
  const files = a.slice(2).filter((x) => !x.startsWith("--"));
  fs.writeFileSync(out, JSON.stringify({ numPassedTests: files.length || 3, numFailedTests: 0 }));
}
`;

let repo: string;
let home: string;
let bin: string;

function git(...a: string[]): void {
  expect(spawnSync("git", a, { cwd: repo, encoding: "utf8" }).status).toBe(0);
}

beforeEach(() => {
  repo = tempDir("hx bench repo");
  home = tempDir("hx bench home");
  bin = tempDir("hx bench bin");
  fs.writeFileSync(path.join(bin, "fake.js"), FAKE);
  // Fake npm first on PATH: the real one takes ~5 s per call here.
  fs.writeFileSync(path.join(bin, "npm.js"), NPM);
  fs.writeFileSync(path.join(bin, "npm.cmd"), '@node "%~dp0npm.js" %*\r\n');
  fs.writeFileSync(path.join(bin, "npm"), '#!/bin/sh\nexec node "$(dirname "$0")/npm.js" "$@"\n', {
    mode: 0o755,
  });
  fs.writeFileSync(path.join(repo, "README.md"), "fake\n");
  git("init", "-q");
  git("add", "-A");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base");
  fs.mkdirSync(path.join(repo, IN, "hidden", "desafio-1", "test"), { recursive: true });
  fs.writeFileSync(path.join(repo, IN, "desafio-1.md"), "Faça o desafio 1.\n");
  fs.writeFileSync(path.join(repo, IN, "hidden", "desafio-1", "test", "edge.test.js"), "//\n");
  fs.writeFileSync(
    path.join(home, "config.json"),
    JSON.stringify({
      workers: { gemini: { token: TOKEN, url: "http://localhost:1", model: "gemini/x" } },
    }),
  );
});
afterEach(() => {
  rm(repo);
  rm(home);
  rm(bin);
});

const pathKey = Object.keys(process.env).find((k) => /^path$/i.test(k)) ?? "PATH";

function bench(model: string, env: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [BENCH, "desafio-1", model, "--repo", repo], {
    encoding: "utf8",
    env: {
      ...process.env,
      [pathKey]: `${bin}${path.delimiter}${process.env[pathKey] ?? ""}`,
      HARNESS_HOME: home,
      HX_CLAUDE_BIN: `node "${path.join(bin, "fake.js")}"`,
      ...env,
    },
  });
  const read = (ext: string) =>
    fs.readFileSync(path.join(repo, OUT, `desafio-1-${model}${ext}`), "utf8");
  return { ...r, read };
}

describe("bench.mjs", () => {
  it("writes the json with every field and the patch", () => {
    const r = bench("opus");
    expect(r.status, r.stderr).toBe(0);
    const j = JSON.parse(r.read(".json"));
    expect(j).toMatchObject({
      challenge: "desafio-1",
      model: "opus",
      turns: 7,
      tokens: { input: 100, output: 50, cache_read: 1000, cache_creation: 10 },
      cost_usd: 0.42,
      exit_code: 0,
      timed_out: false,
      errors_429: 1,
      limits_before: null,
      limits_after: null,
      lint: { typecheck: true, eslint: false, format: true },
      acceptance: { ok: true, passed: 1, failed: 0 },
      hidden: { ok: true, passed: 1, failed: 0 },
    });
    const npm = fs.readFileSync(path.join(bin, "npm.log"), "utf8");
    expect(npm.split("\n")[0]).toMatch(/^ci\b/);
    expect(npm).toContain("test/edge.test.js");
    expect(j.base).toMatch(/^[0-9a-f]{40}$/);
    expect(j.duration_s).toBeGreaterThanOrEqual(0);
    expect(j.diff_lines).toBeGreaterThan(0);
    const patch = r.read(".patch");
    expect(patch).toContain("feature.js");
    expect(patch).toContain("Faça o desafio 1.");
    expect(patch).toContain("--model opus --agent main-harness:executor");
    expect(patch).not.toContain(home); // the run gets its own HARNESS_HOME
    expect(patch).not.toContain("edge.test.js"); // hidden tests stay out of the diff
  }, 120000);

  it("gemini goes through OmniRoute and the token never leaks", () => {
    const r = bench("gemini");
    expect(r.status, r.stderr).toBe(0);
    const all = r.read(".json") + r.read(".patch") + r.stdout + r.stderr;
    expect(all).not.toContain(TOKEN);
    expect(r.read(".patch")).toContain("***");
    expect(JSON.parse(r.read(".json")).model).toBe("gemini");
  }, 120000);

  it("kills the run at the time limit", () => {
    const r = bench("sonnet", { FAKE_SLEEP: "1", HX_BENCH_TIMEOUT_MS: "1500" });
    expect(r.status, r.stderr).toBe(0);
    const j = JSON.parse(r.read(".json"));
    expect(j.timed_out).toBe(true);
    expect(j.turns).toBeNull();
    expect(j.duration_s).toBeLessThan(30);
  }, 120000);

  it("rejects an unknown model", () => {
    const r = spawnSync(process.execPath, [BENCH, "desafio-1", "gpt", "--repo", repo], {
      encoding: "utf8",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Apelido gpt");
  });
});
