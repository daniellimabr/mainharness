import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { emit } from "../src/events/emit";
import { validateEvent } from "../src/events/schema";
import { computeMetrics, parsePlan, renderMetrics } from "../src/sprint/index";
import { isolateHome, REPO_ROOT } from "./helpers";

let env: ReturnType<typeof isolateHome>;
beforeEach(() => {
  env = isolateHome();
});
afterEach(() => env.cleanup());

it("sprint.metrics: two usage events with the same message_id count once", () => {
  const plan = parsePlan(
    fs.readFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), "utf8"),
  );
  for (let i = 0; i < 2; i++)
    emit({
      project: "proj-d",
      sprint: "S01",
      task: "T01",
      type: "usage",
      data: {
        model: "claude-sonnet-5-5",
        input: 10,
        output: 5,
        cache_write: 2,
        cache_read: 100,
        usd: 0.5,
        message_id: "dup",
        transcript: "main",
      },
    });
  const m = computeMetrics("proj-d", "S01", plan);
  expect(m.usd).toBe(0.5);
  expect(m.tokens_input).toBe(10);
});

it("sprint.metrics: calls per task and cost per executor; roundStats counts a response once", () => {
  const plan = parsePlan(
    fs.readFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), "utf8"),
  );
  let sec = 0;
  const at = () => `2026-10-01T10:00:${String(++sec).padStart(2, "0")}Z`;
  const usage = (task: string, model: string, usd: number, id: string) =>
    emit({
      project: "proj-x",
      sprint: "S01",
      ts: at(),
      task,
      type: "usage",
      data: {
        model,
        input: 1,
        output: 1,
        cache_write: 0,
        cache_read: 0,
        usd,
        message_id: id,
        transcript: "main",
      },
    });
  usage("T01", "claude-sonnet-5-5", 0.5, "a");
  usage("T01", "claude-sonnet-5-5", 0.5, "a"); // duplicate
  usage("T01", "claude-opus-5-5", 2, "b");
  usage("T02", "claude-haiku-4-5", 0.1, "c");
  usage("T02", "claude-sonnet-5-5", 0.2, "d");
  emit({
    project: "proj-x",
    sprint: "S01",
    ts: at(),
    type: "sprint.feedback",
    data: { adjustments: 1 },
  });
  usage("T02", "claude-sonnet-5-5", 0.4, "e");
  usage("T02", "claude-sonnet-5-5", 0.4, "e"); // duplicate inside the round
  emit({
    project: "proj-x",
    sprint: "S01",
    ts: at(),
    type: "sprint.close",
    data: { tasks_done: 0, tasks_total: 0, duration_s: 0 },
  });
  const m = computeMetrics("proj-x", "S01", plan);
  expect(m.calls_by_task).toEqual({ T01: 2, T02: 3 });
  expect(m.usd_by_task).toEqual({ T01: 2.5, T02: 0.7 });
  expect(m.usd_by_executor).toEqual({ Sonnet: 1.1, Opus: 2, Haiku: 0.1 });
  expect(m.feedback_usd).toBe(0.4);
  const out = renderMetrics("S01", plan, m);
  expect(out).toContain(
    "| Custo por executor | Sonnet US$ 1.10 · Opus US$ 2.00 · Haiku US$ 0.10 |",
  );
  expect(out).toContain("| Chamadas por tarefa | T01 2 · T02 3 |");
});

it("sprint.metrics: cost, tokens and models per model, schema-valid, shown by renderMetrics", () => {
  const plan = parsePlan(
    fs.readFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), "utf8"),
  );
  const usage = (task: string, model: string, usd: number, id: string) =>
    emit({
      project: "proj-m",
      sprint: "S01",
      task,
      type: "usage",
      data: {
        model,
        input: 10,
        output: 5,
        cache_write: 2,
        cache_read: 100,
        usd,
        message_id: id,
        transcript: "main",
      },
    });
  usage("T01", "claude-sonnet-5-5", 0.5, "a");
  usage("T01", "claude-opus-5-5", 2, "b");
  usage("T02", "claude-sonnet-5-5", 0.7, "c");
  usage("T02", "claude-sonnet-5-5", 0.1, "d");

  const m = computeMetrics("proj-m", "S01", plan);
  expect(m.usd_by_model).toEqual({ "claude-sonnet-5-5": 1.3, "claude-opus-5-5": 2 });
  expect(m.tokens_by_model["claude-sonnet-5-5"]).toEqual({
    input: 30,
    output: 15,
    cache_write: 6,
    cache_read: 300,
  });
  expect(m.models_by_task).toEqual({
    T01: ["claude-opus-5-5", "claude-sonnet-5-5"],
    T02: ["claude-sonnet-5-5"],
  });
  const ev = {
    v: 1,
    id: "01J00000000000000000000000",
    ts: "2026-10-15T00:00:00Z",
    harness: "0.1.0",
    project: "proj-m",
    session: null,
    sprint: "S01",
    task: null,
    agent: null,
    type: "sprint.metrics",
    data: { ...m },
  };
  expect(
    validateEvent(ev).filter((e) => e.includes("_by_model") || e.includes("models_by")),
  ).toEqual([]);
  expect(renderMetrics("S01", plan, m)).toContain(
    "| Custo por modelo | claude-sonnet-5-5 US$ 1.30 · claude-opus-5-5 US$ 2.00 |",
  );
  expect(renderMetrics("S01", plan, m)).toMatch(
    /\| Tokens por modelo [^|]*\| claude-sonnet-5-5 [\d.]+ \/ [\d.]+ \/ [\d.]+ \/ [\d.]+ · claude-opus-5-5 /,
  );
});
