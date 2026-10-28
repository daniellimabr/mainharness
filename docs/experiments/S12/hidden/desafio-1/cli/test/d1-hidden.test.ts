// S12 hidden tests, challenge 1 (B099): the lock of `hx worker run` is taken before the spawn.
// Only the evaluator runs them (bench.mjs copies this file into cli/test/ of the clone).
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/worker";
import { fakeProject, HX, isolateHome, REPO_ROOT, rm, runHx } from "./helpers";

const TOKEN = "sk-omni-secret";

let env: ReturnType<typeof isolateHome>;
let dir: string;
let handoff: string;
let out: string[];

const up = vi.fn(async () => new Response("{}", { status: 200 }));
const down = vi.fn(async () => new Response("{}", { status: 503 }));
const fakeSpawn = vi.fn(() => ({ pid: 999999, unref: () => undefined }));
const deps = (fetch = up) => ({ fetch, spawn: fakeSpawn as never, hx: HX });
const lockPath = () => path.join(env.home, "worker", "lock.json");

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
  vi.restoreAllMocks();
  fakeSpawn.mockReset();
  fakeSpawn.mockImplementation(() => ({ pid: 999999, unref: () => undefined }));
  env.cleanup();
  rm(dir);
});

describe("B099 hidden: lock before spawn", () => {
  it("three simultaneous runs spawn exactly one worker", async () => {
    const codes = await Promise.all([1, 2, 3].map(() => run(["run", "T01", handoff], deps())));
    expect(fakeSpawn).toHaveBeenCalledTimes(1);
    expect(codes.sort()).toEqual([0, 1, 1]);
    expect(JSON.parse(fs.readFileSync(lockPath(), "utf8"))).toMatchObject({
      pid: 999999,
      sprint: "S01",
      task: "T01",
    });
  });

  it("a spawn that throws exits 1 and leaves no lock", async () => {
    fakeSpawn.mockImplementationOnce(() => {
      throw new Error("spawn EAGAIN");
    });
    expect(await run(["run", "T01", handoff], deps())).toBe(1);
    expect(fs.existsSync(lockPath())).toBe(false);
    expect(await run(["run", "T01", handoff], deps())).toBe(0);
    expect(fakeSpawn).toHaveBeenCalledTimes(2);
  });

  it("OmniRoute down exits 1, leaves no lock and does not block the next run", async () => {
    expect(await run(["run", "T01", handoff], deps(down))).toBe(1);
    expect(fs.existsSync(lockPath())).toBe(false);
    expect(fakeSpawn).not.toHaveBeenCalled();
    expect(await run(["run", "T01", handoff], deps())).toBe(0);
    expect(fakeSpawn).toHaveBeenCalledTimes(1);
  });

  it("no token configured exits 1 and leaves no lock", async () => {
    fs.writeFileSync(path.join(env.home, "config.json"), JSON.stringify({ worker: {} }));
    expect(await run(["run", "T01", handoff], deps())).toBe(1);
    expect(fs.existsSync(lockPath())).toBe(false);
  });

  it("refused arguments leave no lock", async () => {
    for (const args of [
      ["run", "X1", handoff],
      ["run", "T99", handoff],
      ["run", "T01", path.join(dir, "nope.md")],
    ])
      expect(await run(args, deps())).toBe(1);
    expect(fs.existsSync(lockPath())).toBe(false);
  });

  it("a corrupt or empty lock file does not block a run", async () => {
    fs.mkdirSync(path.dirname(lockPath()), { recursive: true });
    for (const junk of ["{not json", ""]) {
      fs.writeFileSync(lockPath(), junk);
      fakeSpawn.mockClear();
      expect(await run(["run", "T01", handoff], deps())).toBe(0);
      expect(fakeSpawn).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fs.readFileSync(lockPath(), "utf8"))).toMatchObject({ pid: 999999 });
    }
  });

  it("a live lock of another task still refuses, before any spawn", async () => {
    fs.mkdirSync(path.dirname(lockPath()), { recursive: true });
    const live = JSON.stringify({ pid: process.pid, sprint: "S01", task: "T02" });
    fs.writeFileSync(lockPath(), live);
    expect(await run(["run", "T01", handoff], deps())).toBe(1);
    expect(fakeSpawn).not.toHaveBeenCalled();
    expect(fs.readFileSync(lockPath(), "utf8")).toBe(live);
  });
});
