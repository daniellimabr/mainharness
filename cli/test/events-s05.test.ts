// S05 events: agent.start/agent.end, prompt (never the text), session.start title, project.status, Stop typecheck only in the harness repo.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run as status } from "../src/commands/status";
import { updateState } from "../src/core/state";
import { stop, subagentStart, subagentStop } from "../src/hooks/lifecycle";
import { prompt } from "../src/hooks/prompt";
import { sessionStart } from "../src/hooks/session-start";
import { fakeProject, isolateHome, readEventsIn, rm } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.HARNESS_REPO;
  env.cleanup();
  rm(proj);
});

const events = (type: string) => readEventsIn(env.home).filter((e) => e.type === type);

describe("agent.start / agent.end", () => {
  it("records agent id, type and the single task in progress", () => {
    updateState("proj-teste", (s) => {
      s.activeSprint = "S05";
      s.tasks = { T01: { start: "2026-10-21T10:00:00Z" }, T00: { start: "x", end: "y" } };
    });
    const base = { cwd: proj, session_id: "s1", agent_id: "agent-abc123" };
    subagentStart({
      ...base,
      hook_event_name: "SubagentStart",
      agent_type: "main-harness:reviewer",
    });
    subagentStop({ ...base, hook_event_name: "SubagentStop", agent_type: "main-harness:reviewer" });
    const [start] = events("agent.start");
    const [end] = events("agent.end");
    expect(start).toMatchObject({
      session: "s1",
      sprint: "S05",
      task: "T01",
      agent: "main-harness:reviewer",
      data: { agent_id: "agent-abc123" },
    });
    expect(end).toMatchObject({ task: "T01", data: { agent_id: "agent-abc123" } });
  });

  it("leaves task null with several tasks in progress and agent null for an empty type", () => {
    updateState("proj-teste", (s) => {
      s.tasks = { T01: { start: "a" }, T02: { start: "b" } };
    });
    subagentStart({ cwd: proj, session_id: "s1", agent_id: "a1", agent_type: "" });
    expect(events("agent.start")[0]).toMatchObject({ task: null, agent: null });
  });
});

describe("prompt", () => {
  it("records time and session, never the prompt text", () => {
    const secret = "SEGREDO-do-prompt 42";
    prompt({ cwd: proj, session_id: "s9", hook_event_name: "UserPromptSubmit", prompt: secret });
    expect(events("prompt")).toMatchObject([{ session: "s9", data: {} }]);
    const raw = fs
      .readdirSync(path.join(env.home, "events"))
      .map((f) => fs.readFileSync(path.join(env.home, "events", f), "utf8"))
      .join("");
    expect(raw).not.toContain("SEGREDO");
  });
});

describe("session.start title", () => {
  it("adds the chat title when the hook sends it", () => {
    sessionStart({
      cwd: proj,
      session_id: "s1",
      source: "startup",
      session_title: "Meu chat; T01",
    });
    expect(events("session.start")[0]).toMatchObject({ data: { title: "Meu chat  T01" } });
  });

  it("has no title when the hook does not send it", () => {
    sessionStart({ cwd: proj, session_id: "s1", source: "startup" });
    expect(events("session.start")[0]?.data).not.toHaveProperty("title");
  });
});

describe("hx status", () => {
  it("emits project.status with where and next", () => {
    vi.spyOn(process, "cwd").mockReturnValue(proj);
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(status(["--where", "T01 em testes", "--next", "revisão"])).toBe(0);
    expect(events("project.status")).toMatchObject([
      { data: { where: "T01 em testes", next: "revisão" } },
    ]);
  });

  it("refuses without both flags", () => {
    vi.spyOn(process, "cwd").mockReturnValue(proj);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(status(["--where", "x"])).toBe(1);
    expect(events("project.status")).toEqual([]);
  });
});

describe("Stop typecheck only in the harness repo", () => {
  beforeEach(() => {
    // Dirty cli/src in a git repo and a fake tsc that fails and leaves a marker.
    fs.mkdirSync(path.join(proj, "cli", "src"), { recursive: true });
    fs.writeFileSync(path.join(proj, "cli", "tsconfig.json"), "{}");
    fs.writeFileSync(path.join(proj, "cli", "src", "a.ts"), "export {};\n");
    const bin = path.join(proj, "node_modules", "typescript", "bin");
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(
      path.join(bin, "tsc"),
      `require("fs").writeFileSync(${JSON.stringify(path.join(proj, "ran"))}, "1");` +
        `console.log("cli/src/a.ts(1,1): error TS1");process.exit(2);`,
    );
    spawnSync("git", ["init", "-q"], { cwd: proj });
    // Stage cli/ so porcelain lists `?? cli/src/` instead of collapsing to `?? cli/`.
    spawnSync("git", ["add", "cli/tsconfig.json"], { cwd: proj });
  });

  it("does not run tsc outside the harness repo", () => {
    process.env.HARNESS_REPO = env.home;
    expect(stop({ cwd: proj, session_id: "s1" })).toEqual({});
    expect(fs.existsSync(path.join(proj, "ran"))).toBe(false);
  });

  it("blocks with tsc errors inside the harness repo", () => {
    process.env.HARNESS_REPO = proj;
    expect(stop({ cwd: proj, session_id: "s1" }).stdout).toContain("error TS1");
  });
});
