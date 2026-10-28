// S12 hidden tests, challenge 2 (B105): a worker that dies without a report gets a failure report.
// Only the evaluator runs them (bench.mjs copies this file into cli/test/ of the clone).
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/worker";
import { fakeProject, HX, isolateHome, REPO_ROOT, rm, runHx } from "./helpers";

const TOKEN = "sk-omni-secret";
const DEAD = 999999;

let env: ReturnType<typeof isolateHome>;
let dir: string;
let handoff: string;
let out: string[];

const up = vi.fn(async () => new Response("{}", { status: 200 }));
const fakeSpawn = vi.fn(() => ({ pid: 999998, unref: () => undefined }));
const deps = () => ({ fetch: up, spawn: fakeSpawn as never, hx: HX });
const workerDir = () => path.join(env.home, "worker");
const lockPath = () => path.join(workerDir(), "lock.json");
const report = (t = "T01") => path.join(workerDir(), `S01-${t}.md`);
const hourAgo = (h: number) => new Date(Date.now() - h * 3600_000);

function writeLock(lock: unknown): void {
  fs.mkdirSync(workerDir(), { recursive: true });
  fs.writeFileSync(lockPath(), typeof lock === "string" ? lock : JSON.stringify(lock));
}

beforeEach(() => {
  env = isolateHome();
  dir = fakeProject();
  const plan = path.join(dir, "docs", "sprints", "S01-plan.md");
  fs.mkdirSync(path.dirname(plan), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), plan);
  for (const a of [
    ["sprint", "approve", "S01"],
    ["sprint", "open", "S01"],
    ["task", "start", "T01"],
  ])
    expect(runHx(a, { cwd: dir }).code).toBe(0);
  handoff = path.join(dir, "handoff T01.md");
  fs.writeFileSync(handoff, "Faça a T01.\n");
  fs.writeFileSync(
    path.join(env.home, "config.json"),
    JSON.stringify({ worker: { token: TOKEN, url: "http://localhost:20128" } }),
  );
  out = [];
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  vi.spyOn(console, "log").mockImplementation((m: string) => void out.push(m));
  vi.spyOn(console, "error").mockImplementation((m: string) => void out.push(m));
});
afterEach(() => {
  expect(out.join("\n")).not.toContain(TOKEN);
  for (const f of fs.existsSync(workerDir()) ? fs.readdirSync(workerDir()) : [])
    expect(fs.readFileSync(path.join(workerDir(), f), "utf8")).not.toContain(TOKEN);
  vi.restoreAllMocks();
  fakeSpawn.mockClear();
  env.cleanup();
  rm(dir);
});

describe("B105 hidden: worker that died without a report", () => {
  it("a live worker is left alone: no report, no warning", async () => {
    writeLock({ pid: process.pid, sprint: "S01", task: "T01" });
    expect(await run(["status"], deps())).toBe(0);
    expect(fs.existsSync(report())).toBe(false);
    expect(out.join("\n")).not.toMatch(/falhou/i);
  });

  it("a report newer than the lock is kept as is, without warning", async () => {
    writeLock({ pid: DEAD, sprint: "S01", task: "T01" });
    fs.utimesSync(lockPath(), hourAgo(1), hourAgo(1));
    fs.writeFileSync(report(), "# Trabalhador S01/T01\n\ntrabalho feito\n");
    expect(await run(["status"], deps())).toBe(0);
    expect(fs.readFileSync(report(), "utf8")).toBe("# Trabalhador S01/T01\n\ntrabalho feito\n");
    expect(out.join("\n")).not.toMatch(/falhou/i);
  });

  it("a report from an earlier run (older than the lock) is replaced by the failure report", async () => {
    fs.mkdirSync(workerDir(), { recursive: true });
    fs.writeFileSync(report(), "relatório antigo da corrida anterior\n");
    fs.utimesSync(report(), hourAgo(2), hourAgo(2));
    writeLock({ pid: DEAD, sprint: "S01", task: "T01" });
    expect(await run(["status"], deps())).toBe(0);
    const text = fs.readFileSync(report(), "utf8");
    expect(text).toMatch(/falhou/i);
    expect(text).not.toContain("relatório antigo");
    expect(out.join("\n")).toMatch(/S01\/T01/);
  });

  it("warns and writes the report even when the worker is not configured", async () => {
    fs.writeFileSync(path.join(env.home, "config.json"), JSON.stringify({ worker: {} }));
    writeLock({ pid: DEAD, sprint: "S01", task: "T01" });
    expect(await run(["status"], deps())).toBe(1);
    expect(fs.readFileSync(report(), "utf8")).toMatch(/falhou/i);
    expect(out.join("\n")).toMatch(/S01\/T01[\s\S]*falhou|falhou[\s\S]*S01\/T01/i);
  });

  it("hx worker run over a dead lock writes the failure report of the old task and still starts", async () => {
    writeLock({ pid: DEAD, sprint: "S01", task: "T02" });
    expect(await run(["run", "T01", handoff], deps())).toBe(0);
    expect(fakeSpawn).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(report("T02"), "utf8")).toMatch(/falhou/i);
    expect(fs.existsSync(report("T01"))).toBe(false);
  });

  it("the warning is given once: a second status stays quiet", async () => {
    writeLock({ pid: DEAD, sprint: "S01", task: "T01" });
    expect(await run(["status"], deps())).toBe(0);
    expect(out.join("\n")).toMatch(/falhou/i);
    const first = fs.readFileSync(report(), "utf8");
    out.length = 0;
    expect(await run(["status"], deps())).toBe(0);
    expect(out.join("\n")).not.toMatch(/falhou/i);
    expect(fs.readFileSync(report(), "utf8")).toBe(first);
  });

  it("a corrupt lock or one without sprint/task writes nothing and does not crash", async () => {
    for (const lock of ["{not json", { pid: DEAD }, { pid: DEAD, sprint: "S01" }]) {
      writeLock(lock);
      expect(await run(["status"], deps())).toBe(0);
      expect(fs.readdirSync(workerDir()).filter((f) => f !== "lock.json")).toEqual([]);
    }
  });
});
