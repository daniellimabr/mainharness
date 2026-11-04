import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isolateHome, REPO_ROOT } from "./helpers";

const SCRIPT = path.join(REPO_ROOT, "scripts", "overhead.mjs");

describe("scripts/overhead.mjs", () => {
  let env: ReturnType<typeof isolateHome>;
  beforeEach(() => {
    env = isolateHome();
  });
  afterEach(() => env.cleanup());

  const run = (...a: string[]) =>
    spawnSync(process.execPath, [SCRIPT, ...a], { encoding: "utf8", env: { ...process.env } });
  const ev = (type: string, ts: string, extra: object = {}) =>
    JSON.stringify({ type, ts, sprint: null, data: {}, ...extra });
  const row = (md: string, name: string) =>
    md
      .split("\n")
      .find((l) => l.startsWith(`| ${name} |`))
      ?.split("|")
      .slice(2, -1)
      .map((c) => c.trim()) ?? [];

  it("counts calls, seconds and tokens per sprint, and disk/noise per day", () => {
    fs.mkdirSync(path.join(env.home, "events"));
    const lines = [
      ev("sprint.open", "2026-01-01T00:00:00Z", { sprint: "S99" }),
      ev("session.start", "2026-01-01T00:01:00Z"),
      ev("session.start", "2026-01-01T00:02:00Z"),
      ev("prompt", "2026-01-01T00:03:00Z"),
      ev("prompt", "2026-01-01T00:04:00Z"),
      ev("prompt", "2026-01-01T00:05:00Z"),
      ev("error", "2026-01-01T00:06:00Z", { data: { source: "tool" } }),
      "{ not json",
      ev("sprint.close", "2026-01-01T00:07:00Z", { sprint: "S99" }),
      ev("prompt", "2026-01-02T00:00:00Z"), // outside the sprint
    ];
    fs.writeFileSync(path.join(env.home, "events", "2026-01-01.jsonl"), lines.join("\n") + "\n");
    const r = run("--n", "1", "--sprints", "S99");
    expect(r.status).toBe(0);
    const prompt = row(r.stdout, "prompt");
    expect(prompt[2]).toBe("3");
    expect(prompt[3]).toBe(((3 * Number(prompt[0])) / 1000).toFixed(3));
    expect(prompt[4]).toBe("0"); // prompt injects nothing
    const start = row(r.stdout, "session-start");
    expect(start[2]).toBe("2");
    expect(Number(start[4]) % 2).toBe(0);
    expect(row(r.stdout, "post-tool-failure")[2]).toBe("1");
    expect(r.stdout).toMatch(/\| 2026-01-01 \| \d+ \| 10 \| 1 \|/);
    expect(r.stdout).toContain("Linhas inválidas ignoradas: 1.");
  });

  it("missing events folder gives an empty table, not a crash", () => {
    const r = run("--n", "1");
    expect(r.status).toBe(0);
    expect(row(r.stdout, "prompt")[2]).toBe("0");
  });

  it("writes to --out and rejects an invalid --n", () => {
    const out = path.join(env.home, "o.md");
    expect(run("--n", "1", "--out", out).status).toBe(0);
    expect(fs.readFileSync(out, "utf8")).toContain("# Overhead dos hooks");
    for (const bad of ["0", "abc", "-2"]) expect(run("--n", bad).status).toBe(1);
  });
});
