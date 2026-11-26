// S19/T02: the web dashboard is gone. emit only appends events; old event files stay readable.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emit, readEvents } from "../src/events/emit";
import { EVENT_TYPES } from "../src/events/schema";
import { computeMetrics, parsePlan } from "../src/sprint/index";
import { isolateHome } from "./helpers";

let env: ReturnType<typeof isolateHome>;
beforeEach(() => (env = isolateHome()));
afterEach(() => env.cleanup());

const REMOVED = ["attention", "context", "error", "project.status", "statusline"];

describe("without the dashboard", () => {
  it("a cycle event writes only the events folder", () => {
    emit({ type: "task.start", project: "p", sprint: "S01", task: "T01", data: {} });
    expect(fs.readdirSync(env.home)).toEqual(["events"]);
  });

  it("no longer has the event types that only fed the dashboard", () => {
    expect(EVENT_TYPES.filter((t) => REMOVED.includes(t))).toEqual([]);
  });

  it("reads old files with removed types and still computes metrics", () => {
    const base = { v: 1, harness: "0.16.0", project: "p", sprint: "S01", task: "T01", data: {} };
    const lines = [
      ...REMOVED.map((type) => ({ ...base, type, ts: "2026-10-01T10:00:00Z" })),
      { ...base, type: "task.done", ts: "2026-10-01T10:05:00Z", data: { duration_s: 300 } },
    ];
    fs.mkdirSync(path.join(env.home, "events"));
    fs.writeFileSync(
      path.join(env.home, "events", "2026-10-01.jsonl"),
      lines.map((l) => JSON.stringify(l)).join("\n") + "\n",
    );
    expect(readEvents()).toHaveLength(lines.length);
    const plan = parsePlan(
      "## Tarefas\n\n| Id | Tarefa | Agente | Arquivos | Estimativa |\n|---|---|---|---|---|\n" +
        "| T01 | x | clone | a | 10 min |\n",
    );
    expect(computeMetrics("p", "S01", plan)).toMatchObject({ tasks_done: 1, actual_min: 5 });
  });
});
