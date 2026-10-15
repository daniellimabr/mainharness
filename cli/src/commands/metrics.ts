// hx metrics [sprint] [--emit]: sprint indicators from events + plan, as a markdown table.
import { flagStr, parseArgs } from "../core/args";
import { commandContext } from "../core/context";
import { emit } from "../events/emit";
import { boolFlag, loadPlan, sprintId } from "../sprint/cmd";
import { computeMetrics, renderMetrics } from "../sprint/index";

export function run(args: string[]): number {
  const p = parseArgs(args);
  const doEmit = boolFlag(p, "emit");
  const ctx = commandContext(process.cwd(), flagStr(p, "agent"));
  const id = sprintId(p._[0]) ?? ctx.sprint;
  if (!id) throw new Error("informe a sprint: hx metrics S01");
  const { plan } = loadPlan(ctx.root, id);
  const m = computeMetrics(ctx.id, id, plan);
  console.log(renderMetrics(id, plan, m));
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
