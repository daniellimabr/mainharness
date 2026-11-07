// hx review pass|fail <task>: records the Reviewer's verdict for a task.
import { flagStr, parseArgs } from "../core/args";
import { commandContext } from "../core/context";
import { emit } from "../events/emit";
import { loadPlan } from "../sprint/cmd";
import { resolveTaskId } from "../sprint/index";

export function run(args: string[]): number {
  const p = parseArgs(args);
  const [result, raw] = p._;
  if ((result !== "pass" && result !== "fail") || !raw) {
    console.error("uso: hx review pass|fail <tarefa>");
    return 1;
  }
  const ctx = commandContext(process.cwd(), flagStr(p, "agent"));
  let plan;
  try {
    plan = ctx.sprint ? loadPlan(ctx.root, ctx.sprint).plan : undefined;
  } catch {
    // no plan file: keep the id as typed
  }
  const name = /^ajuste$/i.test(raw) && p._[2] ? `${raw} ${p._[2]}` : raw;
  const task = (plan ? resolveTaskId(plan, name) : undefined) ?? name.toUpperCase();
  emit({
    type: "review.result",
    project: ctx.id,
    session: ctx.session,
    sprint: ctx.sprint,
    task,
    agent: ctx.agent,
    data: { result },
  });
  console.log(`Revisão de ${task}: ${result === "pass" ? "aprovada" : "reprovada"}.`);
  return 0;
}
