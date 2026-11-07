import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/sprint";
import { validateEvent } from "../src/events/schema";
import { planProblems, taskLine } from "../src/sprint/index";
import { fakeProject, isolateHome, readEventsIn, REPO_ROOT, rm } from "./helpers";

const TEMPLATE = fs.readFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), "utf8");
const OLD = TEMPLATE.replace("| Depende de | Bruta |", "|").replace(/^\*\*Ondas:.*$/m, "");

describe("plano validado, sprint.open com tarefas, +Nd", () => {
  let env: ReturnType<typeof isolateHome>;
  let dir: string;
  let plan: string;
  let cwd: string;

  beforeEach(() => {
    cwd = process.cwd();
    env = isolateHome();
    dir = fakeProject();
    plan = path.join(dir, "docs", "sprints", "S01-plan.md");
    fs.mkdirSync(path.dirname(plan), { recursive: true });
    process.chdir(dir);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.chdir(cwd);
    env.cleanup();
    rm(dir);
  });

  it("template plan is valid", () => {
    expect(planProblems(TEMPLATE)).toEqual([]);
  });

  it("approve refuses a plan outside the format, lists what is missing and cites --force", () => {
    fs.writeFileSync(plan, OLD);
    expect(planProblems(OLD)).toEqual([
      'coluna "Depende de" na tabela de Tarefas',
      'coluna "Bruta" na tabela de Tarefas',
      'linha "**Ondas:**"',
    ]);
    expect(() => run(["approve", "S01"])).toThrow(/Depende de.*Bruta.*Ondas.*--force/s);
    expect(fs.readFileSync(plan, "utf8")).toBe(OLD);
  });

  it("--force approves anyway", () => {
    fs.writeFileSync(plan, OLD);
    expect(run(["approve", "S01", "--force"])).toBe(0);
    expect(readEventsIn(env.home).some((e) => e.type === "sprint.approved")).toBe(true);
  });

  it("sprint.open carries the plan tasks", () => {
    fs.writeFileSync(plan, TEMPLATE);
    run(["approve", "S01"]);
    run(["open", "S01"]);
    const ev = readEventsIn(env.home).find((e) => e.type === "sprint.open");
    expect(validateEvent(ev)).toEqual([]);
    expect(ev?.data).toMatchObject({
      tasks: 3,
      task_info: { T01: ["Descrição curta", "tech-lead"] },
      task_planned: { T01: 20, T02: 60, T03: 30 },
    });
  });

  it("task line shows +Nd when the day changes and hides a 0 min estimate", () => {
    const t = { id: "T01", title: "x", agent: "a", files: "", planned_min: 0 };
    const times = { start: "2026-11-07T15:00:00Z", end: "2026-11-08T13:54:00Z", duration_s: 60 };
    const line = taskLine(t, times, undefined, undefined, "2026-11-07T15:00:00Z");
    expect(line).toContain("| 12:00 | 10:54 +1d |");
    expect(line).toContain("| a | — |");
  });
});
