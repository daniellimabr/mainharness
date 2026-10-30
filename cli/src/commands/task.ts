// hx task start|done <id> and hx task phase <id> <fase>: task times and phase in state and in the "## Execução" table of SNN-release.md, plus events.
// hx task drop|defer <id> --why: strikes the task out of the plan (B117), which then needs a new approval.
import { execFileSync } from "node:child_process";
import { flagStr, parseArgs } from "../core/args";
import { commandContext } from "../core/context";
import { logError } from "../core/log";
import { readState, updateState, type TaskTimes } from "../core/state";
import { emit, readEvents } from "../events/emit";
import { atFlag, loadPlan } from "../sprint/cmd";
import { dropTask, renderTaskList, taskLine, updateExecution, writePlan } from "../sprint/index";
import { refreshAuto } from "./handoff";

const PHASES = ["testes", "código", "lint", "fila", "revisão", "commit"];

function alreadyDone(id: string): number {
  console.error(`aviso: ${id} já está feita; nada a registrar.`);
  return 0;
}

export function run(args: string[]): number {
  const p = parseArgs(args);
  const [sub, raw] = p._;
  const why = flagStr(p, "why");
  const drops = sub === "drop" || sub === "defer";
  if (
    !sub ||
    !["start", "done", "phase", "drop", "defer"].includes(sub) ||
    !raw ||
    (drops && !why)
  ) {
    console.error(
      'uso: hx task start|done <id> | hx task phase <id> <fase> | hx task drop|defer <id> --why "motivo"',
    );
    return 1;
  }
  const ctx = commandContext(process.cwd(), flagStr(p, "agent"));
  const sprint = ctx.sprint;
  if (!sprint) throw new Error("nenhuma sprint aberta (rode hx sprint open SNN)");
  const id = raw.toUpperCase();
  const { plan } = loadPlan(ctx.root, sprint);
  const task = plan.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`tarefa ${id} não está no plano ${sprint}`);
  const at = atFlag(p);

  const prev = readState(ctx.id).tasks[id];
  if (drops) {
    if (prev?.end) throw new Error(`tarefa ${id} já está feita`);
    const label = sub === "drop" ? "tirada" : "adiada";
    const { file, text } = loadPlan(ctx.root, sprint);
    writePlan(file, text, dropTask(text, id, label, (why ?? "").replace(/\s+/g, " ")));
    // close a task dropped mid-flight so currentTask does not count it as open
    if (prev?.start)
      updateState(ctx.id, (s) => {
        s.tasks[id] = { ...prev, end: at, duration_s: 0 };
      });
    const next = loadPlan(ctx.root, sprint).plan;
    const st = readState(ctx.id).tasks;
    updateExecution(
      ctx.root,
      sprint,
      next.tasks,
      (t) => next.execution[t.id]?.line ?? taskLine(t, st[t.id]),
      st,
    );
    emit({
      project: ctx.id,
      session: ctx.session,
      sprint,
      task: id,
      agent: ctx.agent,
      ts: at,
      type: "task.phase",
      data: { phase: label },
    });
    console.log(renderTaskList(ctx.root, sprint));
    console.error(`${id} ${label}. Precisa de nova aprovação: hx sprint approve ${sprint}.`);
    return 0;
  }
  let times: TaskTimes = { start: at };
  if (sub === "phase") {
    const phase = p._[2] ?? "";
    if (!PHASES.includes(phase))
      throw new Error(`fase inválida '${phase}' (use: ${PHASES.join(", ")})`);
    if (!prev?.start) throw new Error(`tarefa ${id} não está em andamento`);
    if (prev.end) {
      // B083: feedback after the task ended reopens it; the next done sums this pass (B053).
      const reopened = readEvents(
        (e) => e.project === ctx.id && e.sprint === sprint && e.type === "sprint.feedback",
      ).some((e) => Date.parse(e.ts) > Date.parse(prev.end ?? ""));
      if (!reopened) return alreadyDone(id);
      times = { start: at, phase };
    } else times = { ...prev, phase };
  } else if (sub === "done") {
    if (prev?.end) return alreadyDone(id);
    const start = prev?.start ?? at;
    const duration_s = Math.max(0, Math.round((Date.parse(at) - Date.parse(start)) / 1000));
    times = { start, end: at, duration_s };
  }
  const st = updateState(ctx.id, (s) => {
    s.tasks[id] = times;
  });
  updateExecution(
    ctx.root,
    sprint,
    plan.tasks,
    (t) =>
      t.id === id
        ? taskLine(t, times)
        : (plan.execution[t.id]?.line ?? taskLine(t, st.tasks[t.id])),
    st.tasks,
  );
  const ev = { project: ctx.id, session: ctx.session, sprint, task: id, agent: ctx.agent, ts: at };
  if (sub === "phase") emit({ ...ev, type: "task.phase", data: { phase: times.phase ?? "" } });
  else if (sub === "start")
    emit({ ...ev, type: "task.start", data: { planned_min: task.planned_min } });
  else
    emit({
      ...ev,
      type: "task.done",
      data: { duration_s: times.duration_s ?? 0, planned_min: task.planned_min },
    });
  if (sub === "done" && !prev?.start)
    console.error(`aviso: ${id} não tinha início registrado; duração 0.`);

  const taskList = renderTaskList(ctx.root, sprint);
  if (sub === "done" || sub === "phase") {
    try {
      let uncommitted = "";
      try {
        const out = execFileSync("git", ["status", "--porcelain"], {
          cwd: ctx.root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        uncommitted = `\n\nArquivos não commitados:\n${out || "nenhum"}`;
      } catch {
        // no git: leave the list out
      }
      refreshAuto(ctx.id, `## Estado automático (hx)\n\n${taskList}${uncommitted}`);
    } catch (err) {
      logError("task-handoff", err);
    }
  }

  console.log(taskList);
  return 0;
}
