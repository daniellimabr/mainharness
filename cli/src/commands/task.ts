// hx task start|done <id>: task times in state and in the plan's "## Execução" list, plus events.
import { flagStr, parseArgs } from "../core/args";
import { commandContext } from "../core/context";
import { readState, updateState, type TaskTimes } from "../core/state";
import { emit } from "../events/emit";
import { atFlag, loadPlan } from "../sprint/cmd";
import { renderTaskList, taskLine, writeExecution, writePlan } from "../sprint/index";

export function run(args: string[]): number {
  const p = parseArgs(args);
  const [sub, raw] = p._;
  if ((sub !== "start" && sub !== "done") || !raw) {
    console.error("uso: hx task start|done <id>");
    return 1;
  }
  const ctx = commandContext(process.cwd(), flagStr(p, "agent"));
  const sprint = ctx.sprint;
  if (!sprint) throw new Error("nenhuma sprint aberta (rode hx sprint open SNN)");
  const id = raw.toUpperCase();
  const { file, text, plan } = loadPlan(ctx.root, sprint);
  const task = plan.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`tarefa ${id} não está no plano ${sprint}`);
  const at = atFlag(p);

  const prev = readState(ctx.id).tasks[id];
  let times: TaskTimes = { start: at };
  if (sub === "done") {
    const start = prev?.start ?? at;
    const duration_s = Math.max(0, Math.round((Date.parse(at) - Date.parse(start)) / 1000));
    times = { start, end: at, duration_s };
  }
  const st = updateState(ctx.id, (s) => {
    s.tasks[id] = times;
  });
  writePlan(
    file,
    text,
    writeExecution(text, plan.tasks, (t) =>
      t.id === id
        ? taskLine(t, times)
        : (plan.execution[t.id]?.line ?? taskLine(t, st.tasks[t.id])),
    ),
  );
  const ev = { project: ctx.id, session: ctx.session, sprint, task: id, agent: ctx.agent, ts: at };
  if (sub === "start") emit({ ...ev, type: "task.start", data: { planned_min: task.planned_min } });
  else
    emit({
      ...ev,
      type: "task.done",
      data: { duration_s: times.duration_s ?? 0, planned_min: task.planned_min },
    });
  if (sub === "done" && !prev?.start)
    console.error(`aviso: ${id} não tinha início registrado; duração 0.`);
  console.log(renderTaskList(ctx.root, sprint));
  return 0;
}
