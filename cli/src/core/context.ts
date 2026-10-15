// Resolves "who/where" for CLI commands run by agents: project, session, sprint, agent.
import { resolveProject, type ProjectContext } from "./projects";
import { readState } from "./state";

export interface CommandContext extends ProjectContext {
  session: string | null;
  sprint: string | null;
  agent: string;
}

/** For commands that need an attached project. Throws a friendly error otherwise. */
export function commandContext(cwd = process.cwd(), agent?: string): CommandContext {
  const p = resolveProject(cwd);
  if (!p) throw new Error("este repo não está conectado ao harness (rode /attach)");
  const st = readState(p.id);
  return {
    ...p,
    session: process.env.HARNESS_SESSION || st.session,
    sprint: st.activeSprint,
    agent: agent || process.env.HARNESS_AGENT || "tech-lead",
  };
}
