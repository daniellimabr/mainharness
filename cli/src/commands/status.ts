// hx status --where <texto> --next <texto>: records where the project is and what comes next (project.status).
import { flagStr, parseArgs } from "../core/args";
import { commandContext } from "../core/context";
import { emit } from "../events/emit";

export function run(args: string[]): number {
  const p = parseArgs(args);
  const where = flagStr(p, "where");
  const next = flagStr(p, "next");
  if (!where || !next) {
    console.error("uso: hx status --where <onde estamos> --next <próximo passo>");
    return 1;
  }
  const ctx = commandContext(process.cwd(), flagStr(p, "agent"));
  emit({
    type: "project.status",
    project: ctx.id,
    session: ctx.session,
    sprint: ctx.sprint,
    agent: ctx.agent,
    data: { where, next },
  });
  console.log("Status registrado.");
  return 0;
}
