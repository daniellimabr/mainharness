import { describe, expect, it } from "vitest";
import { buildState } from "./build";

const NOW = new Date("2026-11-20T12:00:00Z");
let n = 0;
function ev(type: string, p: Record<string, unknown> = {}) {
  n++;
  return {
    v: 1,
    id: `id${n}`,
    ts: `2026-11-20T10:${String(n % 60).padStart(2, "0")}:00Z`,
    project: "alpha",
    sprint: "S01",
    task: null,
    agent: null,
    session: null,
    harness: "0.16.0",
    type,
    data: {},
    ...p,
  };
}
const usage = (usd: number | null, p: Record<string, unknown> = {}, data = {}) =>
  ev("usage", { data: { usd, message_id: `m${++n}`, ...data }, ...p });
const open = ev("sprint.open", {
  data: { tasks: 2, task_info: { T01: ["Primeira", "executor"], T02: ["Segunda", "tech-lead"] } },
});

describe("buildState", () => {
  it("empty or invalid input gives an empty state", () => {
    const s = buildState([], { now: NOW });
    expect(s).toMatchObject({ v: 1, sprints: [], tasks: [], agents: [], sprint_active: null });
    expect(s.project.total_usd).toBeNull();
    const t = buildState(
      [null, 5, "x", { type: "nope", ts: "2026-11-20T10:00:00Z", data: {} }, { type: "usage" }],
      {
        now: NOW,
      },
    );
    expect(t.sprints).toEqual([]);
  });

  it("task status follows start, phase, review and reopening", () => {
    const evs = [
      open,
      ev("task.start", { task: "T01" }),
      ev("task.phase", { task: "T01", data: { phase: "fila" } }),
      ev("review.result", { task: "T01", data: { result: "fail" } }),
    ];
    const st = (e: unknown[]) => buildState(e, { now: NOW }).tasks.map((t) => t.status);
    expect(st(evs)).toEqual(["reprovada", "a fazer"]);
    expect(st([...evs, ev("task.start", { task: "T01" })])).toEqual(["em andamento", "a fazer"]);
    expect(st([...evs, ev("task.done", { task: "T01" })])).toEqual(["feita", "a fazer"]);
    expect(st(evs.slice(0, 3))).toEqual(["em revisão", "a fazer"]);
    const s = buildState([...evs, ev("task.done", { task: "T01" })], { now: NOW });
    expect(s.tasks[0]).toMatchObject({
      id: "T01",
      title: "Primeira",
      agent: "executor",
      role: "clone",
    });
    expect(s.sprints[0]).toMatchObject({ id: "S01", status: "aberta", done: 1, total: 2 });
    expect(s.sprint_active).toBe("S01");
  });

  it("closed sprint is not active", () => {
    const s = buildState(
      [open, ev("sprint.close", { data: { tasks_done: 2, tasks_total: 2, duration_s: 1 } })],
      {
        now: NOW,
      },
    );
    expect(s.sprint_active).toBeNull();
    expect(s.sprints[0]?.status).toBe("fechada");
    expect(s.tasks).toEqual([]);
  });

  it("active agents: start without end, role by agent", () => {
    const s = buildState(
      [
        ev("agent.start", { agent: "executor", task: "T01", data: { agent_id: "a1" } }),
        ev("agent.start", {
          agent: "main-harness:reviewer",
          task: "T01",
          data: { agent_id: "a2" },
        }),
        ev("agent.start", { agent: "outro", data: { agent_id: "a3" } }),
        ev("agent.end", { data: { agent_id: "a3" } }),
      ],
      { now: NOW },
    );
    expect(s.agents.map((a) => [a.id, a.role, a.task])).toEqual([
      ["a1", "clone", "T01"],
      ["a2", "reviewer", "T01"],
    ]);
  });

  it("sums usage per task, day and sprint; null when no data", () => {
    const s = buildState(
      [
        open,
        ev("agent.start", { agent: "executor", task: "T01", data: { agent_id: "a1" } }),
        usage(1, { task: "T01" }),
        usage(0.5, { task: null }, { agent_id: "a1" }),
        usage(2, { sprint: null, ts: "2026-11-19T10:00:00Z" }),
        usage(null, { task: "T02" }),
      ],
      { now: NOW },
    );
    expect(s.tasks.map((t) => t.usd)).toEqual([1.5, null]);
    expect(s.sprints[0]?.usd).toBe(1.5);
    expect(s.usd_by_day).toEqual({ "2026-11-19": 2, "2026-11-20": 1.5 });
    expect(s.project.total_usd).toBe(3.5);
    expect(buildState([open], { now: NOW }).sprints[0]?.usd).toBeNull();
  });

  it("duplicate message_id counts once", () => {
    const u = usage(1, {}, { message_id: "same" });
    expect(buildState([u, u], { now: NOW }).project.total_usd).toBe(1);
  });

  it("keeps one project; parado after 30 min without activity", () => {
    const evs = [usage(1, { project: "beta" }), usage(2, { project: "alpha" })];
    expect(buildState(evs, { now: NOW, project: "beta" }).project).toMatchObject({
      id: "beta",
      total_usd: 1,
    });
    expect(buildState(evs, { now: NOW }).project).toMatchObject({
      id: "beta",
      total_usd: 1,
      parado: true,
    });
    expect(buildState(evs, { now: new Date("2026-11-20T10:30:00Z") }).project.parado).toBe(false);
  });
});
