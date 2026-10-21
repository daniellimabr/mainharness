// hx sprint approve|open|status|feedback|close: sprint lifecycle on docs/sprints/SNN-plan.md.
import { flagStr, parseArgs, type Parsed } from "../core/args";
import { type CommandContext, commandContext } from "../core/context";
import { readState, updateState } from "../core/state";
import { harnessVersion } from "../core/version";
import { emit, readEvents, utcStamp } from "../events/emit";
import { atFlag, boolFlag, loadPlan, sprintId } from "../sprint/cmd";
import {
  computeMetrics,
  fillApproval,
  fmtMin,
  planHash,
  type Plan,
  type PlanTask,
  planRel,
  renderMetrics,
  renderTaskList,
  taskLine,
  updateExecution,
  writePlan,
} from "../sprint/index";

const CHANGED = "plano mudou depois da aprovação: precisa de nova aprovação";

export function run(args: string[]): number {
  const p = parseArgs(args);
  const force = boolFlag(p, "force");
  const [sub, arg] = p._;
  const ctx = commandContext(process.cwd(), flagStr(p, "agent"));
  if (sub === "feedback") return feedback(ctx, arg);
  const id = sprintId(arg) ?? ctx.sprint;
  if (!sub || !["approve", "open", "status", "close"].includes(sub)) {
    console.error("uso: hx sprint approve|open|status|close <id> | hx sprint feedback <n>");
    return 1;
  }
  if (!id) throw new Error(`informe a sprint: hx sprint ${sub} S01`);
  if (sub === "approve") return approve(ctx, p, id, force);
  if (sub === "open") return open(ctx, p, id);
  if (sub === "close") return close(ctx, p, id, force);
  const list = renderTaskList(ctx.root, id);
  if (!list) throw new Error(`plano não encontrado: docs/sprints/${id}-plan.md`);
  console.log(list);
  return 0;
}

const base = (ctx: CommandContext, sprint: string) => ({
  project: ctx.id,
  session: ctx.session,
  sprint,
  agent: ctx.agent,
});

function approve(ctx: CommandContext, p: Parsed, id: string, force: boolean): number {
  const { file, text, plan } = loadPlan(ctx.root, id);
  // fillApproval separates a new section with a blank line; hash the text as it will be written.
  const sha = planHash(text.replace(/\n*$/, "\n\n"));
  let a = plan.approval;
  if (a && a.sha256 !== sha && !force) throw new Error(CHANGED);
  if (!a || a.sha256 !== sha) {
    a = { approver: flagStr(p, "by") ?? "Daniel", at: atFlag(p), sha256: sha };
    writePlan(file, text, fillApproval(text, a, harnessVersion()));
  }
  const seen = readEvents(
    (e) => e.project === ctx.id && e.type === "sprint.approved" && e.data.sha256 === sha,
  );
  if (seen.length) {
    console.log(`Aprovação de ${id} já registrada (hash ${sha.slice(0, 12)}…).`);
    return 0;
  }
  const at = new Date(a.at);
  const ts = Number.isNaN(at.getTime()) ? utcStamp() : utcStamp(at);
  emit({
    ...base(ctx, id),
    type: "sprint.approved",
    ts,
    data: { plan: planRel(id), sha256: sha, approved_at: ts, approver: a.approver },
  });
  console.log(`Plano ${id} aprovado por ${a.approver} em ${ts} (hash ${sha.slice(0, 12)}…).`);
  return 0;
}

function open(ctx: CommandContext, p: Parsed, id: string): number {
  const { text, plan } = loadPlan(ctx.root, id);
  if (!plan.approval)
    throw new Error(
      `plano ${id} ainda não aprovado (rode hx sprint approve ${id} após o ok de Daniel)`,
    );
  if (plan.approval.sha256 !== planHash(text)) throw new Error(CHANGED);
  if (!plan.tasks.length) throw new Error("o plano não tem tarefas na seção Tarefas");
  const at = atFlag(p);
  const st = updateState(ctx.id, (s) => {
    if (s.activeSprint !== id) {
      s.tasks = {};
      s.sprintOpenedAt = at;
    }
    s.activeSprint = id;
    s.sprintOpenedAt ??= at;
  });
  refresh(ctx, id, plan, st.tasks);
  emit({ ...base(ctx, id), type: "sprint.open", ts: at, data: { tasks: plan.tasks.length } });
  console.log(renderTaskList(ctx.root, id));
  return 0;
}

/** Rewrites the execution table (task rows, feedback rounds, total) from state and events. */
function refresh(
  ctx: CommandContext,
  id: string,
  plan: Plan,
  tasks = readState(ctx.id).tasks,
): void {
  const line = (t: PlanTask) => plan.execution[t.id]?.line ?? taskLine(t, tasks[t.id]);
  updateExecution(ctx.root, id, plan.tasks, line, tasks);
}

function feedback(ctx: CommandContext, arg: string | undefined): number {
  const n = Number(arg);
  if (!arg || !Number.isInteger(n) || n < 0)
    throw new Error("uso: hx sprint feedback <n de ajustes>");
  if (!ctx.sprint) throw new Error("nenhuma sprint aberta");
  emit({ ...base(ctx, ctx.sprint), type: "sprint.feedback", data: { adjustments: n } });
  refresh(ctx, ctx.sprint, loadPlan(ctx.root, ctx.sprint).plan);
  console.log(`Retorno de Daniel registrado: ${n} ajuste(s).`);
  return 0;
}

function close(ctx: CommandContext, p: Parsed, id: string, force: boolean): number {
  const { plan } = loadPlan(ctx.root, id);
  const pending = plan.tasks.filter((t) => !plan.execution[t.id]?.done).map((t) => t.id);
  if (pending.length && !force)
    throw new Error(`faltam tarefas: ${pending.join(", ")} (use --force para fechar assim mesmo)`);
  const at = atFlag(p);
  const st = readState(ctx.id);
  const opened = st.activeSprint === id && st.sprintOpenedAt ? Date.parse(st.sprintOpenedAt) : NaN;
  const duration_s = Number.isNaN(opened)
    ? 0
    : Math.max(0, Math.round((Date.parse(at) - opened) / 1000));
  const done = plan.tasks.length - pending.length;
  emit({
    ...base(ctx, id),
    type: "sprint.close",
    ts: at,
    data: { tasks_done: done, tasks_total: plan.tasks.length, duration_s },
  });
  refresh(ctx, id, plan, st.tasks); // closes the open feedback round in the table
  const m = computeMetrics(ctx.id, id, plan);
  emit({ ...base(ctx, id), type: "sprint.metrics", ts: at, data: { ...m } });
  updateState(ctx.id, (s) => {
    if (s.activeSprint === id) {
      s.activeSprint = null;
      delete s.sprintOpenedAt;
    }
  });
  const lastDone = Math.max(
    ...readEvents((e) => e.project === ctx.id && e.sprint === id && e.type === "task.done").map(
      (e) => Date.parse(e.ts),
    ),
  );
  const wait = (Date.parse(at) - lastDone) / 60000; // Infinity when no task is done: no wait shown
  const paused = m.pause_min ? ` (pausas: ${fmtMin(m.pause_min)})` : "";
  const waited = wait >= 1 && Number.isFinite(wait) ? ` (aguardou teste por ${fmtMin(wait)})` : "";
  const work = m.wait_min
    ? ` · trabalho ${fmtMin(m.work_min)}, espera por Daniel ${fmtMin(m.wait_min)}`
    : "";
  console.log(
    `Sprint ${id} fechada: ${done}/${plan.tasks.length} tarefas em ${fmtMin(m.wall_min)}${paused}${waited}${work}\n\n${renderMetrics(id, plan, m)}`,
  );
  return 0;
}
