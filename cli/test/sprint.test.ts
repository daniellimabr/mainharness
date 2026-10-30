import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emit } from "../src/events/emit";
import { validateEvent } from "../src/events/schema";
import {
  computeMetrics,
  fmtMin,
  renderMetrics,
  updateExecution,
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
import { updateState } from "../src/core/state";

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
      "| 🔄 | **Total** | 3 tarefas |  | 1 h 50 min | 2026-10-14 23:05 | ~2026-10-15 00:55 (previsto) |  |",
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

  it("total row forecast: start + planned + pauses so far, date only when the day changes", () => {
    const tasks = parsePlan(TEMPLATE).tasks;
    const pause45 = () => 45 * 60000;
    expect(totalLine(tasks, { T01: { start: "2026-10-15T02:05:00Z" } }, pause45)).toContain(
      "| 2026-10-14 23:05 | ~2026-10-15 01:40 (previsto) |  |",
    );
    expect(totalLine(tasks, { T01: { start: "2026-10-15T12:00:00Z" } })).toContain(
      "| 2026-10-15 09:00 | ~10:50 (previsto) |  |",
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
    expect(hx("sprint", "approve", "S01").code).toBe(0); // B095: re-approval replaces the section
    expect(hx("sprint", "open", "S01").code).toBe(0);
  });

  it("task phase shows on the 🔄 row only, rejects bad input and is cleared by done", () => {
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01");
    expect(hx("task", "phase", "T01", "revisão").stderr).toContain("não está em andamento");
    hx("task", "start", "T01", "--at", "2026-10-15T02:05:00Z");
    const bad = hx("task", "phase", "T01", "deploy");
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain("testes, código, lint, fila, revisão, commit");
    expect(hx("task", "phase", "T01", "lint").code).toBe(0);
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
    expect(hx("task", "phase", "T01", "commit").stderr).toContain("já está feita");
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
    // gaps up to 30 min only: no pause (B037) in this flow
    hx("task", "done", "T02", "--at", "2026-10-15T03:00:00Z", "--agent", "tech-lead");
    const noStart = hx(
      "task",
      "done",
      "T03",
      "--at",
      "2026-10-15T03:20:00Z",
      "--agent",
      "reviewer",
    );
    expect(noStart.code).toBe(0);
    expect(noStart.stderr).toContain("aviso");

    const done = events().filter((e) => e.type === "task.done");
    expect(done.map((e) => [e.task, (e.data as { duration_s: number }).duration_s])).toEqual([
      ["T01", 1200],
      ["T02", 1800],
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
    expect(c.stdout.split("\n")[0]).toBe(
      "Sprint S01 fechada: 3/3 tarefas em 1 h 15 min (aguardou teste por 40 min)",
    );
    expect(c.stdout).toContain("### Indicadores — S01");
    expect(c.stdout).toContain("| Reprovações do Reviewer | 1 |");
    // sequential with gaps: wall clock (02:05 → 03:20) is longer than the sum
    expect(c.stdout).toContain("| **Total** | 1 h 50 min | 50 min (soma) | | US$ 2.25 |");
    expect(c.stdout).toContain(
      "| Tempo de relógio (previsto · corrido) | 1 h 50 min · 1 h 15 min |",
    );
    expect(c.stdout).toContain("| Soma das tarefas (planejada · real) | 1 h 50 min · 50 min |");
    const close = events().find((e) => e.type === "sprint.close");
    expect(close?.data).toEqual({ tasks_done: 3, tasks_total: 3, duration_s: 7200 });
    const m = events().find((e) => e.type === "sprint.metrics");
    expect(m?.data).toMatchObject({
      tasks_total: 3,
      tasks_done: 3,
      planned_min: 110,
      planned_wall_min: 110,
      actual_min: 50,
      tokens_input: 300,
      tokens_output: 150,
      tokens_cache_write: 30,
      tokens_cache_read: 3000,
      usd: 2.25,
      rework: 3,
      review_rejections: 1,
      usd_by_agent: { "tech-lead": 2, reviewer: 0.25 },
      usd_by_task: { T01: 1.5, T02: 0.5, T03: 0.25 },
      actual_min_by_task: { T01: 20, T02: 30, T03: 0 },
    });
    expect(hx("sprint", "status").code).toBe(1); // no active sprint anymore
  });

  it("metrics total: parallel tasks make the sum longer than the wall clock", () => {
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01", "--at", "2026-10-15T01:55:00Z");
    hx("task", "start", "T01", "--at", "2026-10-15T02:00:00Z");
    hx("task", "start", "T02", "--at", "2026-10-15T02:00:00Z");
    // activity in the middle: 30-min gaps are work, not pause (B037)
    emit({
      project: "proj-teste",
      sprint: "S01",
      type: "handoff",
      ts: "2026-10-15T02:30:00Z",
      data: { mode: "manual", file: null },
    });
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
    for (const [type, ts] of [
      ["turn.end", "03:10"],
      ["prompt", "03:15"],
    ] as const)
      emit({
        project: "proj-teste",
        sprint: "S01",
        session: "s1",
        type,
        ts: `2026-10-15T${ts}:00Z`,
        data: {},
      });
    const c = hx("sprint", "close", "S01", "--at", "2026-10-15T03:30:40Z");
    expect(c.stdout.split("\n")[0]).toBe(
      "Sprint S01 fechada: 3/3 tarefas em 1 h 30 min · trabalho 1 h 25 min, espera por Daniel 5 min",
    );
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

describe("pauses, time to review and feedback rounds (B035, B037, B040)", () => {
  let env: ReturnType<typeof isolateHome>;
  let dir: string;
  beforeEach(() => {
    env = isolateHome();
    dir = fakeProject();
    fs.mkdirSync(path.join(dir, "docs", "sprints"), { recursive: true });
  });
  afterEach(() => {
    env.cleanup();
    rm(dir);
  });

  const at = (hm: string) => `2026-10-15T${hm}:00Z`;
  const ev = (type: string, hm: string, data: Record<string, unknown>, task?: string) =>
    emit({
      project: "proj-teste",
      sprint: "S01",
      agent: "tech-lead",
      task: task ?? null,
      type: type as "usage",
      ts: at(hm),
      data,
    });
  const usage = (hm: string, usd = 0) =>
    ev("usage", hm, {
      model: "m",
      input: 1,
      output: 1,
      cache_write: 0,
      cache_read: 0,
      usd,
      message_id: `m-${hm}`,
      transcript: "main",
    });
  const phase = (task: string, hm: string) => ev("task.phase", hm, { phase: "revisão" }, task);
  const task = (id: string, start: string, end: string) => {
    ev("task.start", start, {}, id);
    return {
      start: at(start),
      end: at(end),
      duration_s: (Date.parse(at(end)) - Date.parse(at(start))) / 1000,
    };
  };

  it("leaves pauses over 30 min out, shows time to review and measures each feedback round", () => {
    const t1 = task("T01", "02:00", "03:10");
    usage("02:10");
    usage("02:55"); // 45 min without events: pause
    phase("T01", "02:58"); // rejected delivery: the last one before done counts (B060)
    phase("T01", "03:00");
    ev("task.done", "03:10", { duration_s: t1.duration_s }, "T01");
    const t2 = task("T02", "03:10", "03:45");
    usage("03:30"); // 20 min without events: not a pause
    ev("task.done", "03:45", { duration_s: t2.duration_s }, "T02");
    const t3 = task("T03", "03:45", "04:00");
    ev("task.done", "04:00", { duration_s: t3.duration_s }, "T03");
    ev("sprint.feedback", "04:10", { adjustments: 2 });
    usage("04:20", 0.4);
    ev("sprint.feedback", "04:30", { adjustments: 1 });
    usage("04:40", 0.1);
    ev("sprint.close", "04:50", { tasks_done: 3, tasks_total: 3, duration_s: 0 });

    const plan = parsePlan(TEMPLATE);
    const m = computeMetrics("proj-teste", "S01", plan);
    expect(m).toMatchObject({
      actual_min_by_task: { T01: 15, T02: 35, T03: 15 },
      review_min_by_task: { T01: 10 },
      pause_min: 45,
      wall_min: 75,
      feedback_rounds: 2,
      feedback_min: 40,
      feedback_usd: 0.5,
    });
    const md = renderMetrics("S01", plan, m);
    expect(md).toContain("| T01 | 20 min | 15 min (revisão: 10 min) |");
    expect(md).toMatch(/\| T02 \| [^|]+ \| 35 min \|/);
    expect(md).toContain("| Pausas (mais de 30 min sem eventos, fora do corrido) | 45 min |");
    expect(md).toContain(
      "| Rodadas de ajuste (quantidade · tempo · custo) | 2 · 40 min · US$ 0.50 |",
    );

    updateExecution(dir, "S01", plan.tasks, (t) => taskLine(t), { T01: t1, T02: t2, T03: t3 });
    const rel = fs.readFileSync(path.join(dir, "docs", "sprints", "S01-release.md"), "utf8");
    expect(rel).toContain(
      "| ✅ | T01 | Descrição curta | tech-lead | 20 min | 23:00 | 00:10 | 15 min (revisão: 10 min) |",
    );
    expect(rel).toMatch(/\| ✅ \| T02 \|.*\| 00:10 \| 00:45 \| 35 min \|/);
    expect(rel).toContain("| ✅ | Ajuste 1 | 2 ajuste(s) |  |  | 01:10 | 01:30 | 20 min |");
    expect(rel).toContain("| ✅ | Ajuste 2 | 1 ajuste(s) |  |  | 01:30 | 01:50 | 20 min |");
    expect(rel).toContain(
      "| ✅ | **Total** | 3 tarefas |  | 1 h 50 min | 2026-10-14 23:00 | 2026-10-15 01:00 | 1 h 15 min (pausas: 45 min) |",
    );
    fs.copyFileSync(
      path.join(REPO_ROOT, "templates", "sprint-plan.md"),
      path.join(dir, "docs", "sprints", "S01-plan.md"),
    );
    expect(renderTaskList(dir, "S01")).toContain("| ✅ | Ajuste 2 |");
  });

  it("with a fila phase, splits queue and review after delivery (B068)", () => {
    const t1 = task("T01", "02:00", "02:21");
    ev("task.phase", "02:04", { phase: "fila" }, "T01");
    phase("T01", "02:18");
    ev("task.done", "02:21", { duration_s: t1.duration_s }, "T01");
    const plan = parsePlan(TEMPLATE);
    const m = computeMetrics("proj-teste", "S01", plan);
    expect(m).toMatchObject({
      actual_min_by_task: { T01: 4 },
      queue_min_by_task: { T01: 14 },
      review_min_by_task: { T01: 3 },
    });
    expect(renderMetrics("S01", plan, m)).toContain(
      "| T01 | 20 min | 4 min (fila: 14 min, revisão: 3 min) |",
    );
    updateExecution(dir, "S01", plan.tasks, (t) => taskLine(t), { T01: t1 });
    const rel = fs.readFileSync(path.join(dir, "docs", "sprints", "S01-release.md"), "utf8");
    expect(rel).toContain("| 23:00 | 23:21 | 4 min (fila: 14 min, revisão: 3 min) |");
  });

  it("open sprint: open round and forecast with the pauses so far", () => {
    const t1 = task("T01", "02:00", "03:10");
    usage("02:10");
    usage("02:55");
    ev("task.done", "03:10", { duration_s: t1.duration_s }, "T01");
    ev("sprint.feedback", "03:20", { adjustments: 1 });
    const plan = parsePlan(TEMPLATE);
    updateExecution(dir, "S01", plan.tasks, (t) => taskLine(t), { T01: t1 });
    const rel = fs.readFileSync(path.join(dir, "docs", "sprints", "S01-release.md"), "utf8");
    expect(rel).toContain("| 🔄 | Ajuste 1 | 1 ajuste(s) |  |  | 00:20 |  |  |");
    // 23:00 + 1 h 50 min + 45 min of pause
    expect(rel).toContain("| 2026-10-14 23:00 | ~2026-10-15 01:35 (previsto) |  |");
  });

  it("separates the wait for Daniel from the work (B045)", () => {
    const turn = (type: "turn.end" | "prompt", hm: string, session = "s1") =>
      emit({ project: "proj-teste", sprint: "S01", session, type, ts: at(hm), data: {} });
    const t1 = task("T01", "10:00", "11:20");
    turn("turn.end", "10:10");
    turn("prompt", "10:15"); // 5 min wait
    turn("prompt", "10:16", "s2"); // no turn.end before it: no wait
    usage("10:20");
    turn("turn.end", "10:25");
    turn("turn.end", "10:30"); // only the last turn end before the prompt counts
    turn("prompt", "11:10"); // 40 min wait, also a pause: not taken twice from the work
    usage("11:15");
    ev("task.done", "11:20", { duration_s: t1.duration_s }, "T01");
    turn("turn.end", "11:22", "s2");
    turn("prompt", "11:30", "s2"); // 8 min after the last task: wait, but out of the work
    turn("turn.end", "11:40"); // no prompt yet: no wait
    const plan = parsePlan(TEMPLATE);
    const m = computeMetrics("proj-teste", "S01", plan);
    expect(m).toMatchObject({ wall_min: 40, pause_min: 40, wait_min: 53, work_min: 35 });
    expect(renderMetrics("S01", plan, m)).toContain(
      "| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 53 min · 35 min |",
    );
  });

  it("reopened task sums its passes (B053)", () => {
    const p1 = task("T01", "10:00", "10:06");
    ev("task.done", "10:06", { duration_s: p1.duration_s }, "T01");
    usage("10:30"); // no pause between the passes: the gap must still be left out
    const p2 = task("T01", "11:00", "11:04");
    const plan = parsePlan(TEMPLATE);
    // hx task done rewrites the table before emitting its task.done
    updateExecution(dir, "S01", plan.tasks, (t) => taskLine(t), { T01: p2 });
    const rel = fs.readFileSync(path.join(dir, "docs", "sprints", "S01-release.md"), "utf8");
    expect(rel).toContain(
      "| ✅ | T01 | Descrição curta | tech-lead | 20 min | 07:00 | 08:04 | 10 min |",
    );
    ev("task.done", "11:04", { duration_s: p2.duration_s }, "T01");
    expect(computeMetrics("proj-teste", "S01", plan).actual_min_by_task).toEqual({ T01: 10 });
  });
});

describe("task handoff auto-refresh", () => {
  let env: ReturnType<typeof isolateHome>;
  let dir: string;
  let plan: string;
  const hx = (...args: string[]) => runHx(args, { cwd: dir });

  beforeEach(() => {
    env = isolateHome();
    dir = fakeProject();
    plan = path.join(dir, "docs", "sprints", "S01-plan.md");
    fs.mkdirSync(path.dirname(plan), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), plan);
  });
  afterEach(() => {
    env.cleanup();
    rm(dir);
  });

  it("updates handoff with auto section on task phase and done, replaces it, and ignores when no handoff", () => {
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01");

    // sem handoff: task phase não cria handoff
    expect(hx("task", "start", "T01").code).toBe(0);
    expect(hx("task", "phase", "T01", "código").code).toBe(0);
    const handoffDir = path.join(env.home, "handoffs", "proj-teste");
    expect(fs.existsSync(handoffDir) ? fs.readdirSync(handoffDir) : []).toHaveLength(0);

    // criando um handoff manualmente
    fs.mkdirSync(handoffDir, { recursive: true });
    const handoffFile = path.join(handoffDir, "20261015-020500.md");
    fs.writeFileSync(handoffFile, "MEU TEXTO\n");

    updateState("proj-teste", (s) => {
      s.lastHandoff = { file: handoffFile, at: "2026-10-15T02:05:00Z", consumed: false };
    });

    // task phase atualiza o handoff com a seção automática
    expect(hx("task", "phase", "T01", "revisão").code).toBe(0);
    let content = fs.readFileSync(handoffFile, "utf8");
    expect(content).toContain("MEU TEXTO");
    expect(content).toContain("<!-- hx:auto -->");
    expect(content).toContain("## Estado automático (hx)");

    // task done substitui a seção automática (aparece uma vez só)
    expect(hx("task", "done", "T01").code).toBe(0);
    content = fs.readFileSync(handoffFile, "utf8");
    expect(content).toContain("MEU TEXTO");
    const matches = content.match(/<!-- hx:auto -->/g);
    expect(matches).toHaveLength(1);
    expect(content).toContain("✅");
  });

  it("keeps the agent's text byte for byte and lists uncommitted files (git repo)", () => {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01");
    hx("task", "start", "T01");
    const handoffFile = path.join(env.home, "handoffs", "proj-teste", "h.md");
    fs.mkdirSync(path.dirname(handoffFile), { recursive: true });
    const agent = "# Handoff\n\nTexto com $& e $1.\n";
    fs.writeFileSync(handoffFile, agent);
    updateState("proj-teste", (s) => {
      s.lastHandoff = { file: handoffFile, at: "2026-10-15T02:05:00Z", consumed: false };
    });
    expect(hx("task", "phase", "T01", "lint").code).toBe(0);
    fs.writeFileSync(path.join(dir, "novo-arquivo.txt"), "x");
    expect(hx("task", "done", "T01").code).toBe(0);
    const content = fs.readFileSync(handoffFile, "utf8");
    expect(content.startsWith(agent.trimEnd())).toBe(true);
    expect(content).toContain("Arquivos não commitados:");
    expect(content).toContain("novo-arquivo.txt");
  });

  it("a broken handoff never makes hx task fail", () => {
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01");
    hx("task", "start", "T01");
    updateState("proj-teste", (s) => {
      s.lastHandoff = { file: dir, at: "2026-10-15T02:05:00Z", consumed: false }; // a folder: read throws
    });
    const r = hx("task", "done", "T01");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("T01");
  });
});
