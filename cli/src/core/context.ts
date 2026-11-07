// Resolves "who/where" for CLI commands run by agents: project, session, sprint, agent.
import { resolveProject, type ProjectContext } from "./projects";
import { readEvents } from "../events/emit";
import { readState } from "./state";

export interface CommandContext extends ProjectContext {
  session: string | null;
  sprint: string | null;
  agent: string;
}

/** One name per agent type: "main-harness:reviewer" and "reviewer" are the same. */
export const agentName = (type: string): string => type.replace(/^[^:]+:/, "");

/** Agent still running for the task named in the command (hx task phase T02 ...): its agent.start without agent.end. */
function runningAgent(project: string, argv: string[]): string | null {
  const tnn = argv.find((a) => /^T\d{2,3}$/i.test(a))?.toUpperCase();
  if (!tnn) return null;
  const evs = readEvents((e) => e.project === project && e.type.startsWith("agent."));
  const ended = new Set(evs.filter((e) => e.type === "agent.end").map((e) => e.data.agent_id));
  const start = evs
    .reverse()
    .find(
      (e) => e.type === "agent.start" && e.task === tnn && e.agent && !ended.has(e.data.agent_id),
    );
  return start?.agent ?? null;
}

/** For commands that need an attached project. Throws a friendly error otherwise. */
export function commandContext(
  cwd = process.cwd(),
  agent?: string,
  argv = process.argv,
): CommandContext {
  const p = resolveProject(cwd);
  if (!p) throw new Error("este repo não está conectado ao harness (rode /attach)");
  const st = readState(p.id);
  return {
    ...p,
    session: process.env.HARNESS_SESSION || st.session,
    sprint: st.activeSprint,
    agent: agent || process.env.HARNESS_AGENT || runningAgent(p.id, argv) || "tech-lead",
  };
}
