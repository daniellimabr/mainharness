import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { agentMetrics, renderAgentMetrics } from "../src/commands/metrics";
import { home } from "../src/core/paths";
import { buildEvent, type EmitInput } from "../src/events/emit";
import { parsePlan } from "../src/sprint/index";
import { isolateHome } from "./helpers";

let env: ReturnType<typeof isolateHome>;
beforeEach(() => {
  env = isolateHome();
});
afterEach(() => env.cleanup());

function write(evs: Omit<EmitInput, "project">[]): void {
  fs.mkdirSync(home.events(), { recursive: true });
  const lines = evs.map((e) => JSON.stringify(buildEvent({ project: "p", sprint: "S01", ...e })));
  fs.writeFileSync(path.join(home.events(), "2026-10-01.jsonl"), lines.join("\n") + "\n");
}
const ts = (min: number) => `2026-10-01T10:${String(min).padStart(2, "0")}:00Z`;
const plan = parsePlan(
  [
    "# S01",
    "## Tarefas",
    "| Id | Tarefa | Agente | Arquivos | Estimativa |",
    "|---|---|---|---|---|",
    "| T01 | a | clone | x | 10 min |",
    "| T02 | b | clone | x | 10 min |",
    "| T03 | c | tech-lead | x | — |",
  ].join("\n"),
);
const done = (min: number, task: string, agent: string, dur: number) => ({
  type: "task.done" as const,
  ts: ts(min),
  task,
  agent,
  data: { duration_s: dur * 60 },
});
const phase = (min: number, task: string, p: string) => ({
  type: "task.phase" as const,
  ts: ts(min),
  task,
  data: { phase: p },
});

it("ratio per agent ignores plans without estimate", () => {
  write([
    done(10, "T01", "executor", 10),
    done(20, "T02", "executor", 20),
    done(25, "T03", "tech-lead", 5),
  ]);
  const a = agentMetrics("p", "S01", plan);
  expect(a.ratio_by_agent).toEqual({ executor: 1.5 });
  expect(renderAgentMetrics(a)).toContain("executor 1.5x");
});

it("Daniel wait inside a task is not counted outside; wait between tasks is", () => {
  write([
    { type: "task.start", ts: ts(0), task: "T01", data: {} },
    { type: "turn.end", ts: ts(2), session: "s", data: {} },
    { type: "prompt", ts: ts(5), session: "s", data: {} },
    done(10, "T01", "executor", 10),
    { type: "turn.end", ts: ts(12), session: "s", data: {} },
    { type: "prompt", ts: ts(16), session: "s", data: {} },
    done(20, "T02", "executor", 4),
  ]);
  const a = agentMetrics("p", "S01", plan);
  expect(a.wait_outside_task_min).toBe(4); // [12,16]; [2,5] is inside T01 [0,10]
});

it("final review counts overlapping reviews once", () => {
  write([
    phase(10, "T01", "revisão"),
    phase(12, "T02", "revisão"),
    done(14, "T01", "executor", 1),
    done(16, "T02", "executor", 1),
  ]);
  const a = agentMetrics("p", "S01", plan);
  expect(a.review_union_min).toBe(6); // [10,14] U [12,16]
});

it("sprint without events does not crash", () => {
  const a = agentMetrics("p", "S01", plan);
  expect(a).toEqual({ ratio_by_agent: {}, wait_outside_task_min: 0, review_union_min: 0 });
  expect(renderAgentMetrics(a)).toContain("—");
});
