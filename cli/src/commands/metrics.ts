// hx metrics [sprint] [--emit]: sprint indicators from events + plan, as a markdown table.
import { flagStr, parseArgs } from "../core/args";
import { commandContext } from "../core/context";
import { emit, readEvents } from "../events/emit";
import { boolFlag, loadPlan, sprintId } from "../sprint/cmd";
import { computeMetrics, fmtMin, type Plan, renderMetrics } from "../sprint/index";

type Iv = [number, number];

/** Merges overlapping intervals, sorted. */
function merge(iv: Iv[]): Iv[] {
  const out: Iv[] = [];
  for (const [s, e] of [...iv].sort((x, y) => x[0] - y[0])) {
    const prev = out.at(-1);
    if (prev && s <= prev[1]) prev[1] = Math.max(prev[1], e);
    else out.push([s, e]);
  }
  return out;
}

const total = (iv: Iv[]) => iv.reduce((a, [s, e]) => a + e - s, 0);
const min1 = (ms: number) => Math.round(ms / 6000) / 10;

export interface AgentMetrics {
  /** Real/planned minutes per agent of the task.done event; tasks with no estimate left out. */
  ratio_by_agent: Record<string, number>;
  /** Daniel's waits (turn end to next prompt) that fall outside every task pass. */
  wait_outside_task_min: number;
  /** Reviews (last "revisão" phase to done) with concurrent ones counted once. */
  review_union_min: number;
}

// shortcut: pauses (30 min gaps) are not taken out of these intervals, add if it matters.
export function agentMetrics(project: string, sprintId: string, plan: Plan): AgentMetrics {
  const evs = readEvents((e) => e.project === project && e.sprint === sprintId).sort(
    (x, y) => Date.parse(x.ts) - Date.parse(y.ts),
  );
  const planned = new Map(plan.tasks.map((t) => [t.id, t.planned_min]));
  const sum: Record<string, [number, number]> = {};
  const passes: Iv[] = [];
  const reviews: Iv[] = [];
  const waits: Iv[] = [];
  const turnEnd = new Map<string | null, number>();
  const reviewAt = new Map<string, number>();
  for (const e of evs) {
    const t = Date.parse(e.ts);
    const dur = typeof e.data.duration_s === "number" ? e.data.duration_s : 0;
    if (e.type === "turn.end") turnEnd.set(e.session, t);
    else if (e.type === "prompt") {
      const s = turnEnd.get(e.session);
      if (s !== undefined) waits.push([s, t]);
      turnEnd.delete(e.session);
    } else if (e.type === "task.phase" && e.task && e.data.phase === "revisão")
      reviewAt.set(e.task, t);
    else if (e.type === "task.done" && e.task) {
      passes.push([t - dur * 1000, t]);
      const r = reviewAt.get(e.task);
      if (r !== undefined) reviews.push([r, t]);
      reviewAt.delete(e.task);
      const plannedMin = planned.get(e.task) ?? 0;
      if (plannedMin) {
        const s = (sum[e.agent ?? "desconhecido"] ??= [0, 0]);
        s[0] += dur / 60;
        s[1] += plannedMin;
      }
    }
  }
  const w = merge(waits);
  const inTask = merge(passes);
  let inside = 0;
  for (const [ws, we] of w)
    for (const [ps, pe] of inTask) inside += Math.max(0, Math.min(we, pe) - Math.max(ws, ps));
  return {
    ratio_by_agent: Object.fromEntries(
      Object.entries(sum).map(([k, [a, p]]) => [k, Math.round((a / p) * 10) / 10]),
    ),
    wait_outside_task_min: min1(total(w) - inside),
    review_union_min: min1(total(merge(reviews))),
  };
}

export function renderAgentMetrics(a: AgentMetrics): string {
  const ratio =
    Object.entries(a.ratio_by_agent)
      .map(([k, v]) => `${k} ${v}x`)
      .join(" · ") || "—";
  return [
    "",
    "| Indicador | Valor |",
    "|---|---|",
    `| Real/planejado por agente | ${ratio} |`,
    `| Espera por Daniel fora das tarefas | ${fmtMin(a.wait_outside_task_min)} |`,
    `| Revisões (sem contar sobreposição) | ${fmtMin(a.review_union_min)} |`,
  ].join("\n");
}

export function run(args: string[]): number {
  const p = parseArgs(args);
  const doEmit = boolFlag(p, "emit");
  const ctx = commandContext(process.cwd(), flagStr(p, "agent"));
  const id = sprintId(p._[0]) ?? ctx.sprint;
  if (!id) throw new Error("informe a sprint: hx metrics S01");
  const { plan } = loadPlan(ctx.root, id);
  const m = computeMetrics(ctx.id, id, plan);
  console.log(renderMetrics(id, plan, m) + renderAgentMetrics(agentMetrics(ctx.id, id, plan)));
  if (doEmit) {
    emit({
      type: "sprint.metrics",
      project: ctx.id,
      session: ctx.session,
      sprint: id,
      agent: ctx.agent,
      data: { ...m },
    });
    console.log("\nIndicadores gravados.");
  }
  return 0;
}
