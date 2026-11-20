import { describe, expect, it } from "vitest";
import { buildViewModel, formatDay, formatUsd } from "../../extension/src/model";
import type { State } from "../../extension/src/types";

const state = (over: Partial<State> = {}): State => ({
  v: 1,
  updated_at: "2026-11-20T10:00:00Z",
  project: { id: "p", last_event_at: null, total_usd: 12.5, parado: false },
  sprint_active: "S02",
  sprints: [
    { id: "S01", status: "fechada", done: 3, total: 3, usd: 10 },
    { id: "S02", status: "aberta", done: 1, total: 4, usd: null },
  ],
  tasks: [
    { id: "T01", title: null, status: "em andamento", agent: null, role: "tech-lead", usd: null },
  ],
  agents: [{ id: "a1", role: "clone", task: null, since: "2026-11-20T09:59:00Z" }],
  usd_by_day: { "2026-11-19": 2.5, "2026-11-18": 10 },
  ...over,
});

describe("extension model", () => {
  it("formats USD in pt-BR and null as sem dado, never zero", () => {
    expect(formatUsd(1234.5).replace(/\s/g, " ")).toBe("US$ 1.234,50");
    expect(formatUsd(null)).toBe("sem dado");
    expect(formatUsd(0)).not.toBe("sem dado");
    expect(formatDay("2026-11-05")).toBe("05/11");
  });

  it("builds project, sprint, task, agent and day views", () => {
    const vm = buildViewModel([{ id: "p", name: "P", result: { kind: "ok", state: state() } }]);
    const p = vm.projects[0] as (typeof vm.projects)[number];
    expect(p.status).toBe("ativo");
    expect(p.last).toContain("19/11");
    expect(p.sprints[1]).toMatchObject({ progress: "1/4", usd: "sem dado", active: true, pct: 0 });
    expect(p.tasks[0]).toMatchObject({ title: "sem dado", agent: "sem dado", usd: "sem dado" });
    expect(p.agents[0]?.task).toBe("sem dado");
    expect(p.days.map((d) => d.day)).toEqual(["18/11", "19/11"]);
    expect(p.days[0]?.pct).toBe(100);
    expect(vm.activeAgents).toBe(1);
  });

  it("marks parado and missing states without inventing zero", () => {
    const parado = state({
      project: { id: "p", last_event_at: null, total_usd: null, parado: true },
    });
    const vm = buildViewModel([
      { id: "a", name: "A", result: { kind: "ok", state: parado } },
      { id: "b", name: "B", result: { kind: "missing" } },
      { id: "c", name: "C", result: { kind: "newer", v: 2 } },
    ]);
    expect(vm.projects.map((p) => p.status)).toEqual(["parado", "sem dado", "sem dado"]);
    expect(vm.projects[0]?.usd).toBe("sem dado");
    expect(vm.projects[1]?.note).not.toBe("");
    expect(vm.total).toBe("sem dado");
  });
});
