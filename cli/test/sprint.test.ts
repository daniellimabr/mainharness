import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emit } from "../src/events/emit";
import { validateEvent } from "../src/events/schema";
import {
  fmtMin,
  parseEstimate,
  parsePlan,
  planHash,
  plannedWall,
  renderTaskList,
  writeExecution,
  taskLine,
  totalLine,
} from "../src/sprint/index";
import { fakeProject, isolateHome, readEventsIn, REPO_ROOT, rm, runHx } from "./helpers";

const S00 = fs.readFileSync(path.join(REPO_ROOT, "docs", "sprints", "S00-plan.md"), "utf8");
const TEMPLATE = fs.readFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), "utf8");

describe("plan parsing", () => {
  it("reads the real S00 plan: tasks, estimates and the recorded approval hash", () => {
    const plan = parsePlan(S00);
    expect(plan.tasks).toHaveLength(16);
    expect(plan.tasks[0]).toMatchObject({ id: "T01", agent: "tech-lead", planned_min: 20 });
    expect(plan.tasks[3]?.planned_min).toBe(45);
    expect(plan.approval?.approver).toBe("Daniel");
    expect(plan.approval?.at).toBe("2026-10-15T04:59:39Z");
    expect(planHash(S00)).toBe(plan.approval?.sha256);
  });

  it("parses and formats estimates", () => {
    expect(parseEstimate("20 min")).toBe(20);
    expect(parseEstimate("1 h")).toBe(60);
    expect(parseEstimate("1 h 30 min")).toBe(90);
    expect(fmtMin(90)).toBe("1 h 30 min");
    expect(fmtMin(60)).toBe("1 h");
    expect(fmtMin(5)).toBe("5 min");
  });

  it("finds the estimate column by header and keeps escaped pipes in titles", () => {
    const plan = parsePlan(
      "## Tarefas\n\n| Id | Tarefa | Agente | Arquivos | Depende de | Planejado |\n|---|---|---|---|---|---|\n" +
        "| T01 | `a\\|b` | tech-lead | `x` | — | 30 min |\n",
    );
    expect(plan.tasks[0]).toMatchObject({ title: "`a|b`", agent: "tech-lead", planned_min: 30 });
  });

  it("total row: planned sum, first start, last end and wall-clock duration once all are done", () => {
    const tasks = parsePlan(TEMPLATE).tasks;
    expect(totalLine(tasks, {})).toBe("| ⬜ | **Total** | 3 tarefas |  | 1 h 50 min |  |  |  |");
    const t1 = { start: "2026-10-15T02:05:00Z", end: "2026-10-15T02:25:00Z", duration_s: 1200 };
    expect(totalLine(tasks, { T01: t1 })).toBe(
      "| 🔄 | **Total** | 3 tarefas |  | 1 h 50 min | 2026-10-14 23:05 |  |  |",
    );
    const all = {
      T01: t1,
      T02: t1,
      T03: { start: "2026-10-15T02:10:00Z", end: "2026-10-15T04:00:00Z" },
    };
    expect(totalLine(tasks, all)).toBe(
      "| ✅ | **Total** | 3 tarefas |  | 1 h 50 min | 2026-10-14 23:05 | 2026-10-15 01:00 | 1 h 55 min |",
    );
  });

  it("planned wall clock follows 'Depende de' (critical path); no column means sequential", () => {
    const head =
      "## Tarefas\n\n| Id | Tarefa | Agente | Arquivos | Depende de | Planejado |\n|---|---|---|---|---|---|\n";
    const row = (id: string, dep: string, est: string) =>
      `| ${id} | x | a | f | ${dep} | ${est} |\n`;
    const tasks = parsePlan(
      head +
        row("T01", "—", "15 min") +
        row("T02", "—", "20 min") +
        row("T03", "T01, T02", "25 min") +
        row("T04", "T01–T03", "10 min"),
    ).tasks;
    expect(tasks[3]?.deps).toEqual(["T01", "T02", "T03"]);
    expect(plannedWall(tasks)).toBe(55);
    expect(totalLine(tasks, {})).toBe("| ⬜ | **Total** | 4 tarefas |  | 55 min |  |  |  |");
    expect(plannedWall(parsePlan(TEMPLATE).tasks)).toBe(110);
  });

  it("template plan has placeholder approval and 3 tasks", () => {
    const plan = parsePlan(TEMPLATE);
    expect(plan.approval).toBeNull();
    expect(plan.tasks.map((t) => t.id)).toEqual(["T01", "T02", "T03"]);
  });

  it("hash ignores CRLF and the Execução section", () => {
    const h = planHash(S00);
    expect(planHash(S00.replace(/\r?\n/g, "\r\n"))).toBe(h);
    const plan = parsePlan(S00);
    const withExec = writeExecution(S00, plan.tasks, (t) =>
      taskLine(t, { start: "2026-10-15T02:05:00Z" }),
    );
    expect(withExec).toContain("## Execução");
    expect(planHash(withExec)).toBe(h);
    expect(planHash(S00.replace("## Objetivo", "## Objetivo!"))).not.toBe(h);
  });
});

describe("sprint commands (real bundle, project with spaces)", () => {
  let env: ReturnType<typeof isolateHome>;
  let dir: string;
  let plan: string;
  const hx = (...args: string[]) => runHx(args, { cwd: dir });
  const events = () => readEventsIn(env.home);

  beforeEach(() => {
    env = isolateHome();
    dir = fakeProject();
    plan = path.join(dir, "docs", "sprints", "S01-plan.md");
    fs.mkdirSync(path.dirname(plan), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), plan);
  });
  afterEach(() => {
    for (const e of events()) expect(validateEvent(e)).toEqual([]);
    env.cleanup();
    rm(dir);
  });

  it("approve fills the approval section and emits once per hash", () => {
    const r = hx("sprint", "approve", "S01", "--at", "2026-10-15T01:00:00Z", "--by", "Daniel");
    expect(r.stderr).toBe("");
    expect(r.code).toBe(0);
    const text = fs.readFileSync(plan, "utf8");
    const p = parsePlan(text);
    expect(p.approval).toEqual({
      approver: "Daniel",
      at: "2026-10-15T01:00:00Z",
      sha256: planHash(text),
    });
    expect(hx("sprint", "approve", "S01").code).toBe(0);
    const ev = events().filter((e) => e.type === "sprint.approved");
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({
      ts: "2026-10-15T01:00:00Z",
      sprint: "S01",
      data: { plan: "docs/sprints/S01-plan.md", sha256: planHash(text), approver: "Daniel" },
    });
  });

  it("approve of a plan without an approval section records the hash open checks", () => {
    const t = fs.readFileSync(plan, "utf8");
    fs.writeFileSync(plan, `${t.slice(0, t.indexOf("## Aprovação")).trimEnd()}\n`);
    expect(hx("sprint", "approve", "S01").code).toBe(0);
    const o = hx("sprint", "open", "S01");
    expect(o.stderr).toBe("");
    expect(o.code).toBe(0);
  });

  it("open fails when the plan changed after approval", () => {
    expect(hx("sprint", "open", "S01").code).toBe(1); // not approved yet
    hx("sprint", "approve", "S01");
    fs.writeFileSync(plan, fs.readFileSync(plan, "utf8").replace("Uma ou duas", "Três"));
    const r = hx("sprint", "open", "S01");
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("plano mudou depois da aprovação: precisa de nova aprovação");
    expect(hx("sprint", "approve", "S01").code).toBe(1);
  });

  it("task phase shows on the 🔄 row only, rejects bad input and is cleared by done", () => {
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01");
    expect(hx("task", "phase", "T01", "revisão").stderr).toContain("não está em andamento");
    hx("task", "start", "T01", "--at", "2026-10-15T02:05:00Z");
    const bad = hx("task", "phase", "T01", "deploy");
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain("testes, código, revisão, commit");
    const ph = hx("task", "phase", "t01", "revisão");
    expect(ph.code).toBe(0);
    expect(ph.stdout).toContain("| 🔄 revisão | T01 | Descrição curta |");
    expect(ph.stdout).toContain("| ⬜ | T02 |");
    expect(renderTaskList(dir, "S01")).toContain("| 🔄 revisão | T01 |");
    const d = hx("task", "done", "T01", "--at", "2026-10-15T02:25:00Z");
    expect(d.stdout).toContain(
      "| ✅ | T01 | Descrição curta | tech-lead | 20 min | 23:05 | 23:25 |",
    );
    expect(d.stdout).toContain("1/3 feitas");
    expect(hx("task", "phase", "T01", "commit").code).toBe(1);
  });

  it("open, task start/done update the execution list and emit durations; close computes metrics", () => {
    hx("sprint", "approve", "S01", "--at", "2026-10-15T01:00:00Z");
    const o = hx("sprint", "open", "S01", "--at", "2026-10-15T02:00:00Z");
    expect(o.code).toBe(0);
    expect(o.stdout).toContain("Sprint S01 — 0/3 feitas");
    expect(o.stdout).toContain("| ⬜ | T01 | Descrição curta | tech-lead | 20 min |");
    expect(o.stdout).toContain("| ⬜ | **Total** | 3 tarefas |  | 1 h 50 min |");

    const s = hx("task", "start", "t01", "--at", "2026-10-15T02:05:00Z");
    expect(s.code).toBe(0);
    expect(s.stdout).toContain("| 🔄 | T01 | Descrição curta | tech-lead | 20 min | 23:05 |");
    const d = hx("task", "done", "T01", "--at", "2026-10-15T02:25:00Z");
    expect(d.stdout).toContain(
      "| ✅ | T01 | Descrição curta | tech-lead | 20 min | 23:05 | 23:25 | 20 min |",
    );
    expect(d.stdout).toContain("1/3 feitas");
    expect(fs.readFileSync(plan, "utf8")).not.toContain("## Execução");
    const release = fs.readFileSync(plan.replace("-plan.md", "-release.md"), "utf8");
    expect(release).toContain(
      "| ✅ | T01 | Descrição curta | tech-lead | 20 min | 23:05 | 23:25 | 20 min |",
    );
    expect(release).toContain("| 🔄 | **Total** | 3 tarefas |  | 1 h 50 min | 2026-10-14 23:05 |");
    expect(renderTaskList(dir, "S01")).toContain("1/3 feitas");
    expect(renderTaskList(dir, "S01")).toContain("| 🔄 | **Total** |");

    // marking tasks does not invalidate the approval
    expect(hx("sprint", "open", "S01").code).toBe(0);

    hx("task", "start", "T02", "--at", "2026-10-15T02:30:00Z");
    hx("task", "done", "T02", "--at", "2026-10-15T03:45:00Z", "--agent", "tech-lead");
    const noStart = hx(
      "task",
      "done",
      "T03",
      "--at",
      "2026-10-15T03:50:00Z",
      "--agent",
      "reviewer",
    );
    expect(noStart.code).toBe(0);
    expect(noStart.stderr).toContain("aviso");

    const done = events().filter((e) => e.type === "task.done");
    expect(done.map((e) => [e.task, (e.data as { duration_s: number }).duration_s])).toEqual([
      ["T01", 1200],
      ["T02", 4500],
      ["T03", 0],
    ]);
    expect(events().find((e) => e.type === "task.start")).toMatchObject({
      sprint: "S01",
      task: "T01",
      data: { planned_min: 20 },
    });

    // synthetic usage + review + feedback
    const base = { project: "proj-teste", sprint: "S01" };
    const usage = (agent: string, task: string, usd: number) =>
      emit({
        ...base,
        agent,
        task,
        type: "usage",
        data: {
          model: "claude-opus-5-5",
          input: 100,
          output: 50,
          cache_write: 10,
          cache_read: 1000,
          usd,
          message_id: `m-${agent}-${task}`,
          transcript: "main",
        },
      });
    usage("tech-lead", "T01", 1.5);
    usage("tech-lead", "T02", 0.5);
    usage("reviewer", "T03", 0.25);
    expect(hx("review", "fail", "T02", "--agent", "reviewer").code).toBe(0);
    expect(hx("review", "pass", "T02", "--agent", "reviewer").code).toBe(0);
    expect(hx("sprint", "feedback", "2").code).toBe(0);
    expect(hx("sprint", "feedback", "1").code).toBe(0);

    const c = hx("sprint", "close", "S01", "--at", "2026-10-15T04:00:00Z");
    expect(c.stderr).toBe("");
    expect(c.code).toBe(0);
    expect(c.stdout).toContain("### Indicadores — S01");
    expect(c.stdout).toContain("| Reprovações do Reviewer | 1 |");
    // sequential with gaps: wall clock (02:05 → 03:50) is longer than the sum
    expect(c.stdout).toContain("| **Total** | 1 h 50 min | 1 h 35 min (soma) | | US$ 2.25 |");
    expect(c.stdout).toContain(
      "| Tempo de relógio (previsto · corrido) | 1 h 50 min · 1 h 45 min |",
    );
    expect(c.stdout).toContain("| Soma das tarefas (planejada · real) | 1 h 50 min · 1 h 35 min |");
    const close = events().find((e) => e.type === "sprint.close");
    expect(close?.data).toEqual({ tasks_done: 3, tasks_total: 3, duration_s: 7200 });
    const m = events().find((e) => e.type === "sprint.metrics");
    expect(m?.data).toMatchObject({
      tasks_total: 3,
      tasks_done: 3,
      planned_min: 110,
      planned_wall_min: 110,
      actual_min: 95,
      tokens_input: 300,
      tokens_output: 150,
      tokens_cache_write: 30,
      tokens_cache_read: 3000,
      usd: 2.25,
      rework: 3,
      review_rejections: 1,
      usd_by_agent: { "tech-lead": 2, reviewer: 0.25 },
      usd_by_task: { T01: 1.5, T02: 0.5, T03: 0.25 },
      actual_min_by_task: { T01: 20, T02: 75, T03: 0 },
    });
    expect(hx("sprint", "status").code).toBe(1); // no active sprint anymore
  });

  it("metrics total: parallel tasks make the sum longer than the wall clock", () => {
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01", "--at", "2026-10-15T01:55:00Z");
    hx("task", "start", "T01", "--at", "2026-10-15T02:00:00Z");
    hx("task", "start", "T02", "--at", "2026-10-15T02:00:00Z");
    hx("task", "done", "T01", "--at", "2026-10-15T03:00:00Z");
    hx("task", "done", "T02", "--at", "2026-10-15T03:00:00Z");
    hx("task", "start", "T03", "--at", "2026-10-15T03:00:00Z");
    hx("task", "done", "T03", "--at", "2026-10-15T03:30:00Z");
    const r = hx("metrics", "S01", "--emit");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain(
      "| Tempo de relógio (previsto · corrido) | 1 h 50 min · 1 h 30 min |",
    );
    expect(r.stdout).toContain("| Soma das tarefas (planejada · real) | 1 h 50 min · 2 h 30 min |");
  });

  it("close refuses pending tasks unless --force", () => {
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01");
    const r = hx("sprint", "close", "S01");
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("faltam tarefas: T01, T02, T03");
    expect(hx("sprint", "close", "S01", "--force").code).toBe(0);
    expect(events().find((e) => e.type === "sprint.close")?.data).toMatchObject({
      tasks_done: 0,
      tasks_total: 3,
    });
  });

  it("task commands need an open sprint", () => {
    const r = hx("task", "start", "T01");
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("nenhuma sprint aberta");
  });
});
