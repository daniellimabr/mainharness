// hx state rebuild [--all]: rewrites ~/.harness/dashboard/<id>.json from the events.
// Calls rebuildDashboardState directly, so it works even with HARNESS_DASHBOARD=off (explicit request).
import { parseArgs } from "../core/args";
import { commandContext } from "../core/context";
import { readProjects } from "../core/projects";
import { rebuildDashboardState } from "../state/write";

export function run(args: string[]): number {
  const p = parseArgs(args);
  if (p._[0] !== "rebuild") {
    console.error("uso: hx state rebuild [--all]");
    return 1;
  }
  let ids: string[];
  try {
    ids = p.flags.all ? readProjects().map((e) => e.id) : [commandContext().id];
  } catch (err) {
    console.error((err as Error).message);
    return 1;
  }
  let code = 0;
  for (const id of ids) {
    try {
      rebuildDashboardState(id);
      console.log(`${id}: estado reconstruído`);
    } catch (err) {
      console.error(`${id}: não consegui gravar o estado (${(err as Error).message})`);
      code = 1;
    }
  }
  return code;
}
