// hx worker run TNN <handoff>: one detached `claude -p` on OmniRoute (Gemini), env only in the child (ADR 0012).
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/worker";
import { validateEvent } from "../src/events/schema";
import {
  fakeProject,
  HX,
  isolateHome,
  readEventsIn,
  REPO_ROOT,
  rm,
  runHx,
  tempDir,
} from "./helpers";

const TOKEN = "sk-omni-secret";
const MODEL = "gemini/gemini-3.5-flash-lite";
const SETTINGS = `{ "model": "opus" }\n`;

let env: ReturnType<typeof isolateHome>;
let dir: string;
let claudeDir: string;
let handoff: string;
let out: string[];

const up = vi.fn(async () => new Response("{}", { status: 200 }));
const fakeSpawn = vi.fn(() => ({ pid: 999999, unref: () => undefined }));
const deps = () => ({ fetch: up, spawn: fakeSpawn as never, hx: HX });

function writeConfig(url = "http://localhost:20128"): void {
  fs.writeFileSync(
    path.join(env.home, "config.json"),
    JSON.stringify({ worker: { token: TOKEN, url } }),
  );
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
  claudeDir = tempDir("hx claude");
  process.env.CLAUDE_CONFIG_DIR = claudeDir;
  fs.writeFileSync(path.join(claudeDir, "settings.json"), SETTINGS);
  writeConfig();
  out = [];
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  vi.spyOn(console, "log").mockImplementation((m: string) => void out.push(m));
  vi.spyOn(console, "error").mockImplementation((m: string) => void out.push(m));
});
afterEach(() => {
  expect(fs.readFileSync(path.join(claudeDir, "settings.json"), "utf8")).toBe(SETTINGS);
  expect(process.env.ANTHROPIC_BASE_URL).toBeUndefined();
  expect(process.env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
  for (const e of readEventsIn(env.home)) expect(validateEvent(e)).toEqual([]);
  expect(out.join("\n")).not.toContain(TOKEN);
  vi.restoreAllMocks();
  fakeSpawn.mockClear();
  delete process.env.CLAUDE_CONFIG_DIR;
  env.cleanup();
  rm(dir);
  rm(claudeDir);
});

describe("hx worker run: refusals", () => {
  it("rejects a bad task id, a task outside the sprint, a missing or empty handoff", async () => {
    fs.writeFileSync(path.join(dir, "empty.md"), "  \n");
    for (const args of [
      ["run", "X1", handoff],
      ["run", "T99", handoff],
      ["run", "T01", path.join(dir, "nope.md")],
      ["run", "T01", path.join(dir, "empty.md")],
      ["run", "T01"],
    ])
      expect(await run(args, deps())).toBe(1);
    expect(fakeSpawn).not.toHaveBeenCalled();
  });

  it("refuses while another worker runs (live PID) and ignores a lock with a dead PID", async () => {
    const lock = path.join(env.home, "worker", "lock.json");
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, sprint: "S01", task: "T02" }));
    expect(await run(["run", "T01", handoff], deps())).toBe(1);
    expect(out.join("\n")).toMatch(/T02/);
    expect(fakeSpawn).not.toHaveBeenCalled();
    fs.writeFileSync(lock, JSON.stringify({ pid: 999999, sprint: "S01", task: "T02" }));
    expect(await run(["run", "T01", handoff], deps())).toBe(0);
    expect(fakeSpawn).toHaveBeenCalledTimes(1);
  });

  it("spawns a detached child with the OmniRoute env only there", async () => {
    expect(await run(["run", "t01", handoff], deps())).toBe(0);
    const [bin, args, opts] = fakeSpawn.mock.calls[0] as unknown as [
      string,
      string[],
      { detached: boolean; stdio: string; cwd: string; env: NodeJS.ProcessEnv },
    ];
    expect(bin).toBe(process.execPath);
    expect(args).toEqual([HX, "worker", "_child", "S01", "T01", handoff]);
    expect(opts).toMatchObject({ detached: true, stdio: "ignore", cwd: dir });
    expect(opts.env).toMatchObject({
      ANTHROPIC_BASE_URL: "http://localhost:20128",
      ANTHROPIC_AUTH_TOKEN: TOKEN,
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_MODEL: MODEL,
      ANTHROPIC_DEFAULT_OPUS_MODEL: MODEL,
      ANTHROPIC_DEFAULT_SONNET_MODEL: MODEL,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: MODEL,
      CLAUDE_CODE_SUBAGENT_MODEL: MODEL,
    });
    const lock = JSON.parse(fs.readFileSync(path.join(env.home, "worker", "lock.json"), "utf8"));
    expect(lock).toMatchObject({ pid: 999999, sprint: "S01", task: "T01" });
    const start = readEventsIn(env.home).filter((e) => e.type === "worker.start");
    expect(start).toHaveLength(1);
    expect(start[0]).toMatchObject({ agent: "gemini", task: "T01", data: { model: MODEL } });
  });
});

describe("hx worker run: end to end with a fake claude", () => {
  it("runs detached, writes the report, marks fila and emits worker.end", async () => {
    const server = http.createServer((_q, r) => r.end("{}")).listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    writeConfig(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    const seen = path.join(claudeDir, "seen.json");
    const fake = path.join(claudeDir, "fake claude.js");
    fs.writeFileSync(
      fake,
      `let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const e=process.env;` +
        `require("fs").writeFileSync(${JSON.stringify(seen)},JSON.stringify({argv:process.argv.slice(2),stdin:s,` +
        `url:e.ANTHROPIC_BASE_URL,token:e.ANTHROPIC_AUTH_TOKEN,key:e.ANTHROPIC_API_KEY,model:e.ANTHROPIC_MODEL}));` +
        `console.log("trabalho feito");process.exit(3);});`,
    );
    const cmd = await new Promise<{ code: number; stderr: string }>((resolve) =>
      execFile(
        process.execPath,
        [HX, "worker", "run", "T01", handoff],
        {
          cwd: dir,
          env: {
            ...process.env,
            CLAUDE_PLUGIN_ROOT: REPO_ROOT,
            HX_CLAUDE_BIN: `"${process.execPath}" "${fake}"`,
          },
        },
        (err, _o, stderr) => resolve({ code: err ? Number(err.code) : 0, stderr }),
      ),
    );
    server.close();
    expect(cmd.stderr).toBe("");
    expect(cmd.code).toBe(0);
    const report = path.join(env.home, "worker", "S01-T01.md");
    const lock = path.join(env.home, "worker", "lock.json");
    for (let i = 0; i < 150 && fs.existsSync(lock); i++)
      await new Promise((r) => setTimeout(r, 100));
    expect(fs.existsSync(lock)).toBe(false);
    expect(fs.readFileSync(report, "utf8")).toContain("trabalho feito");
    const s = JSON.parse(fs.readFileSync(seen, "utf8"));
    expect(s).toMatchObject({ stdin: "Faça a T01.\n", token: TOKEN, key: "", model: MODEL });
    expect(s.argv).toEqual(["-p", "--allowedTools", "Read,Edit,Write,Glob,Grep,Bash,PowerShell"]);
    const evs = readEventsIn(env.home);
    expect(evs.find((e) => e.type === "worker.end")).toMatchObject({
      agent: "gemini",
      task: "T01",
      data: { model: MODEL, exit_code: 3 },
    });
    expect(evs.find((e) => e.type === "task.phase")).toMatchObject({ data: { phase: "fila" } });
  }, 30000);
});
