import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { home } from "../src/core/paths";
import { buildEvent, type EmitInput } from "../src/events/emit";
import { computeMetrics, parsePlan, renderMetrics } from "../src/sprint/index";
import { isolateHome, REPO_ROOT } from "./helpers";

let env: ReturnType<typeof isolateHome>;
beforeEach(() => {
  env = isolateHome();
});
afterEach(() => env.cleanup());

// Raw lines, so the test does not depend on the usage schema (agent_id comes with T01).
function write(evs: Omit<EmitInput, "project">[]): void {
  fs.mkdirSync(home.events(), { recursive: true });
  const lines = evs.map((e) => JSON.stringify(buildEvent({ project: "p", sprint: "S01", ...e })));
  fs.writeFileSync(path.join(home.events(), "2026-10-01.jsonl"), lines.join("\n") + "\n");
}

const ts = (min: number, sec = 0) =>
  `2026-10-01T10:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}Z`;
let n = 0;
const usage = (at: string, usd: number, extra: Partial<EmitInput> = {}, agentId?: string) => ({
  type: "usage" as const,
  ts: at,
  agent: "tech-lead",
  ...extra,
  data: {
    model: "claude-opus-5-5",
    input: 1,
    output: 1,
    cache_write: 0,
    cache_read: 0,
    usd,
    message_id: `m${++n}`,
    transcript: extra.agent && extra.agent !== "tech-lead" ? "subagent" : "main",
    ...(agentId ? { agent_id: agentId } : {}),
  },
});
const start = (at: string, id: string, task: string, agent: string, data = {}) => ({
  type: "agent.start" as const,
  ts: at,
  task,
  agent,
  data: { agent_id: id, ...data },
});

it("sprint.metrics: cost and calls per task from clones, Reviewer, worker and split main chat", () => {
  write([
    { type: "task.start", ts: ts(0), task: "T01", data: {} },
    usage(ts(0, 30), 1), // only T01 open: all of it to T01
    { type: "task.start", ts: ts(1), task: "T02", data: {} },
    start(ts(2), "a1", "T01", "main-harness:executor"),
    start(ts(2, 1), "a2", "T02", "main-harness:executor"),
    start(ts(2, 2), "a3", "T01", "main-harness:reviewer"),
    start(ts(2, 3), "w1", "T02", "worker", { agent_type: "worker", model: "cfp/glm-5.2" }),
    usage(ts(2, 10), 2, { agent: "main-harness:executor" }, "a1"),
    usage(ts(2, 11), 3, { agent: "main-harness:executor", task: "T02" }),
    usage(ts(2, 12), 0.5, { agent: "main-harness:reviewer" }, "a3"),
    usage(ts(2, 13), 0, { agent: "worker" }, "w1"),
    usage(ts(2, 14), 0.25, { agent: "worker" }, "w1"),
    usage(ts(3), 2), // T01 and T02 open: split equally
    { type: "task.done", ts: ts(10), task: "T01", data: { duration_s: 600 } },
    { type: "task.done", ts: ts(11), task: "T02", data: { duration_s: 600 } },
    usage(ts(12), 0.4), // outside any task
  ]);
  const plan = parsePlan(
    fs.readFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), "utf8"),
  );
  const m = computeMetrics("p", "S01", plan);
  expect(m.usd_by_task).toEqual({ T01: 4.5, T02: 4.25, "sem-tarefa": 0.4 });
  expect(m.calls_by_task).toEqual({ T01: 3.5, T02: 3.5, "sem-tarefa": 1 });
  expect(m.usd_split_by_task).toEqual({ T01: 1, T02: 1 });
  const md = renderMetrics("S01", plan, m);
  expect(md).toMatch(/\| T01 \|.*US\$ 4\.50 \(US\$ 1\.00 rateado\) \|/);
});
