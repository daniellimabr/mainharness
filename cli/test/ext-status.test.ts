import { describe, expect, it } from "vitest";
import type { State } from "../../extension/src/types";
import { buildStatus } from "../../extension/src/statusModel";

const base = (over: Partial<State> = {}): State => ({
  v: 1,
  updated_at: "2026-11-20T10:00:00Z",
  project: { id: "p", last_event_at: null, total_usd: 12.5, parado: false },
  sprint_active: "S18",
  sprints: [],
  tasks: [
    { id: "T07", title: "Barra", status: "em andamento", agent: "c1", role: "clone", usd: null },
  ],
  agents: [],
  usd_by_day: { "2026-11-19": 1, "2026-11-20": 2.5 },
  ...over,
});
const ag = (role: "tech-lead" | "clone" | "reviewer", i: number) => ({
  id: `a${i}`,
  role,
  task: null,
  since: "x",
});
const projects = [{ id: "p", name: "Proj", path: "C:\\Work\\Proj" }];
const ok = (state: State) => ({ p: { kind: "ok" as const, state } });
const flat = (s: string) => s.replace(/\s/g, " ");

describe("buildStatus", () => {
  it("shows active agents by role", () => {
    const st = base({ agents: [ag("tech-lead", 1), ag("clone", 2), ag("clone", 3)] });
    const r = buildStatus(projects, ok(st), ["C:\\Work\\Proj"]);
    expect(r?.text).toContain("TL 1 · clone 2");
    expect(r?.command).toBe("harnessDash.open");
    expect(flat(r?.tooltip ?? "")).toContain("Proj");
    expect(r?.tooltip).toContain("S18");
    expect(r?.tooltip).toContain("T07");
    expect(flat(r?.tooltip ?? "")).toContain("US$ 12,50");
  });

  it("shows parado with last spend when no agent", () => {
    const r = buildStatus(projects, ok(base()), ["C:\\Work\\Proj"]);
    expect(flat(r?.text ?? "")).toContain("parado · US$ 2,50");
  });

  it("shows sem dado, never zero", () => {
    const noSpend = buildStatus(projects, ok(base({ usd_by_day: {} })), ["C:\\Work\\Proj"]);
    expect(noSpend?.text).toContain("parado · sem dado");
    const missing = buildStatus(projects, { p: { kind: "missing" } }, ["C:\\Work\\Proj"]);
    expect(missing?.text).toContain("sem dado");
    expect(missing?.text).not.toContain("0");
  });

  it("returns null when no project matches", () => {
    expect(buildStatus(projects, ok(base()), ["C:\\Other"])).toBeNull();
    expect(buildStatus(projects, ok(base()), [])).toBeNull();
  });

  it("compares Windows paths ignoring case, slashes and trailing separator", () => {
    expect(buildStatus(projects, ok(base()), ["c:/work/proj/"])).not.toBeNull();
    expect(buildStatus(projects, ok(base()), ["c:\\WORK\\proj\\"])).not.toBeNull();
  });
});
