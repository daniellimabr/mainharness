// S17/T02: task events carry the running subagent (executor/reviewer); one Reviewer name; agent.start has the TNN.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commandContext } from "../src/core/context";
import { updateState } from "../src/core/state";
import type { HarnessEvent } from "../src/events/schema";
import { subagentStart, subagentStop } from "../src/hooks/lifecycle";
import { fakeProject, isolateHome, readEventsIn, rm } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;
beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
  updateState("proj-teste", (s) => {
    s.activeSprint = "S17";
    s.tasks = { T02: { start: "2026-11-07T10:00:00Z" } };
  });
});
afterEach(() => {
  env.cleanup();
  rm(proj);
});

const events = (type: string) =>
  (readEventsIn(env.home) as unknown as HarnessEvent[]).filter((e) => e.type === type);
const hook = () => ({ cwd: proj, session_id: "s1" });
const who = (...args: string[]) => commandContext(proj, undefined, ["node", "hx", ...args]).agent;

describe("agent in task events", () => {
  it("a running clone is the agent of its task; after it ends, back to tech-lead", () => {
    subagentStart({ ...hook(), agent_id: "c1", agent_type: "main-harness:executor" });
    expect(who("task", "phase", "T02", "fila")).toBe("executor");
    expect(who("task", "phase", "T03", "fila")).toBe("tech-lead");
    subagentStop({ ...hook(), agent_id: "c1", agent_type: "main-harness:executor" });
    expect(who("task", "done", "T02")).toBe("tech-lead");
  });

  it("the Reviewer has one name in agent.start and in review events", () => {
    subagentStart({ ...hook(), agent_id: "r1", agent_type: "main-harness:reviewer" });
    expect(events("agent.start")[0]?.agent).toBe("reviewer");
    expect(who("review", "pass", "T02")).toBe("reviewer");
  });

  it("agent.start carries the TNN of the task", () => {
    subagentStart({ ...hook(), agent_id: "c1", agent_type: "main-harness:executor" });
    expect(events("agent.start")[0]).toMatchObject({ task: "T02", agent: "executor" });
  });

  it("--agent still wins", () => {
    subagentStart({ ...hook(), agent_id: "c1", agent_type: "main-harness:executor" });
    expect(commandContext(proj, "x", ["node", "hx", "task", "start", "T02"]).agent).toBe("x");
  });
});
