// S13/T06: TNN on agent.start, agent_id + task on alert.context, task on usage.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateState } from "../src/core/state";
import { type HarnessEvent, validateEvent } from "../src/events/schema";
import { preCompact, stop, subagentStart, subagentStop } from "../src/hooks/lifecycle";
import { fakeProject, isolateHome, readEventsIn, rm } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;
let main: string;
beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
  main = path.join(proj, "sess.jsonl");
  vi.stubEnv("HARNESS_CONTEXT_LIMIT", "1000");
  vi.stubEnv("HARNESS_HANDOFF_AT", "900");
  vi.stubEnv("HARNESS_NO_LIMITS", "1");
  vi.stubEnv("HARNESS_REPO", env.home);
});
afterEach(() => {
  vi.unstubAllEnvs();
  env.cleanup();
  rm(proj);
});

const events = (type: string) =>
  (readEventsIn(env.home) as unknown as HarnessEvent[]).filter((e) => e.type === type);
const line = (id: string, input: number, side = false) =>
  JSON.stringify({
    type: "assistant",
    isSidechain: side,
    timestamp: "2026-10-29T10:00:00.000Z",
    message: {
      id,
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      usage: { input_tokens: input },
    },
  }) + "\n";
const subDir = () => path.join(proj, "sess", "subagents");
function subagent(id: string, description?: string): void {
  fs.mkdirSync(subDir(), { recursive: true });
  const meta = { agentType: "main-harness:executor", ...(description ? { description } : {}) };
  fs.writeFileSync(path.join(subDir(), `agent-${id}.meta.json`), JSON.stringify(meta));
  fs.writeFileSync(path.join(subDir(), `agent-${id}.jsonl`), line(`msg_${id}`, 5, true));
}
const tasks = (...open: string[]) =>
  updateState("proj-teste", (s) => {
    s.activeSprint = "S13";
    s.tasks = Object.fromEntries(open.map((t) => [t, { start: "2026-10-29T09:00:00Z" }]));
  });
const base = () => ({ cwd: proj, session_id: "sess", transcript_path: main });

describe("agent.start task", () => {
  it("reads the TNN from the Agent description, even with several tasks open", () => {
    tasks("T06", "T08");
    subagent("a1", "T06 eventos");
    subagent("a2", "Revisar [T08] custo");
    subagentStart({ ...base(), agent_id: "a1", agent_type: "main-harness:executor" });
    subagentStart({ ...base(), agent_id: "a2", agent_type: "main-harness:executor" });
    const evs = events("agent.start");
    expect(evs.map((e) => e.task)).toEqual(["T06", "T08"]);
    for (const e of evs) expect(validateEvent(e)).toEqual([]);
  });

  it("falls back to the single task in progress; unreadable meta never throws", () => {
    tasks("T03");
    fs.mkdirSync(subDir(), { recursive: true });
    fs.writeFileSync(path.join(subDir(), "agent-a3.meta.json"), "{not json");
    expect(subagentStart({ ...base(), agent_id: "a3" })).toEqual({});
    expect(subagentStart({ cwd: proj, session_id: "sess", agent_id: "a4" })).toEqual({});
    expect(events("agent.start").map((e) => e.task)).toEqual(["T03", "T03"]);
  });
});

describe("usage task", () => {
  it("subagent usage gets the agent.start task; main gets the single open task", () => {
    tasks("T06");
    fs.writeFileSync(main, line("msg_main", 10));
    subagent("a1", "[T05] outra");
    subagentStart({ ...base(), agent_id: "a1" });
    subagentStop({ ...base(), agent_id: "a1" });
    const usage = events("usage");
    const byId = (id: string) => usage.find((e) => e.data.message_id === id);
    expect(byId("msg_a1")?.task).toBe("T05");
    expect(byId("msg_main")?.task).toBe("T06");
  });

  it("main usage has no task with several tasks open", () => {
    tasks("T06", "T08");
    fs.writeFileSync(main, line("msg_main", 10));
    stop(base());
    expect(events("usage")[0]?.task).toBeNull();
  });
});

describe("alert.context", () => {
  it("carries agent_id and the task", () => {
    tasks("T06");
    fs.writeFileSync(main, line("m1", 950));
    stop({ ...base(), agent_id: "a9" });
    preCompact(base());
    const alerts = events("alert.context");
    expect(alerts[0]).toMatchObject({ task: "T06", data: { agent_id: "a9", tokens: 950 } });
    expect(alerts[1]).toMatchObject({ task: "T06", data: { agent_id: null } });
    for (const e of alerts) expect(validateEvent(e)).toEqual([]);
  });
});
