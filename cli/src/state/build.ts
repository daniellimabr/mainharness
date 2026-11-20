// Pure: project events -> state object (contract: docs/contracts/state.md). No I/O.
import { EVENT_TYPES, type HarnessEvent } from "../events/schema";

export type Role = "tech-lead" | "clone" | "reviewer";
export type TaskStatus = "a fazer" | "em andamento" | "em revisão" | "feita" | "reprovada";
export interface TaskState {
  id: string;
  title: string | null;
  status: TaskStatus;
  agent: string | null;
  role: Role;
  usd: number | null;
}
export interface SprintState {
  id: string;
  status: "aberta" | "fechada";
  done: number;
  total: number;
  usd: number | null;
}
export interface AgentState {
  id: string;
  role: Role;
  task: string | null;
  since: string;
}
export interface State {
  v: 1;
  updated_at: string;
  project: {
    id: string | null;
    last_event_at: string | null;
    total_usd: number | null;
    parado: boolean;
  };
  sprint_active: string | null;
  sprints: SprintState[];
  tasks: TaskState[];
  agents: AgentState[];
  usd_by_day: Record<string, number>;
}
export interface BuildOptions {
  now?: Date;
  /** Keep only this project; default: the project of the first valid event. */
  project?: string;
}

const IDLE_MS = 30 * 60_000;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const add = (prev: number | null | undefined, usd: number | null) =>
  usd === null ? (prev ?? null) : r4((prev ?? 0) + usd);

export function roleOf(agent: string | null | undefined): Role {
  return agent === "executor"
    ? "clone"
    : agent === "main-harness:reviewer"
      ? "reviewer"
      : "tech-lead";
}

function valid(x: unknown): x is HarnessEvent {
  const e = x as HarnessEvent | null;
  return (
    typeof e === "object" &&
    e !== null &&
    EVENT_TYPES.includes(e.type) &&
    typeof e.ts === "string" &&
    !Number.isNaN(Date.parse(e.ts)) &&
    typeof e.data === "object" &&
    e.data !== null
  );
}

export function buildState(events: readonly unknown[], opts: BuildOptions = {}): State {
  const now = opts.now ?? new Date();
  const all = events.filter(valid).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const projectId = opts.project ?? all[0]?.project ?? null;
  const evs = all.filter((e) => e.project === projectId);

  const sprints = new Map<string, SprintState & { tasks: Map<string, TaskState> }>();
  const agents = new Map<string, AgentState>();
  const agentTask = new Map<unknown, string>();
  const seenMsg = new Set<unknown>();
  const byDay: Record<string, number> = {};
  let total: number | null = null;

  for (const e of evs) {
    const d = e.data;
    const sp = e.sprint ? sprints.get(e.sprint) : undefined;
    const task = sp && e.task ? sp.tasks.get(e.task) : undefined;
    const set = (status: TaskStatus) => {
      if (sp && e.task) {
        const t = task ?? {
          id: e.task,
          title: null,
          status,
          agent: null,
          role: roleOf(null),
          usd: null,
        };
        t.status = status;
        sp.tasks.set(e.task, t);
      }
    };
    switch (e.type) {
      case "sprint.open": {
        const tasks = new Map<string, TaskState>();
        const info = (d.task_info ?? {}) as Record<string, unknown>;
        for (const [id, v] of Object.entries(info)) {
          const [title, agent] = Array.isArray(v) ? v : [];
          tasks.set(id, {
            id,
            title: typeof title === "string" ? title : null,
            status: "a fazer",
            agent: typeof agent === "string" ? agent : null,
            role: roleOf(agent),
            usd: null,
          });
        }
        if (e.sprint)
          sprints.set(e.sprint, {
            id: e.sprint,
            status: "aberta",
            done: 0,
            total: typeof d.tasks === "number" ? d.tasks : 0,
            usd: null,
            tasks,
          });
        break;
      }
      case "sprint.close":
        if (sp) sp.status = "fechada";
        break;
      case "task.start":
        set("em andamento");
        break;
      case "task.phase":
        set(
          ["fila", "revisão", "commit"].includes(String(d.phase)) ? "em revisão" : "em andamento",
        );
        break;
      case "review.result":
        set(d.result === "fail" ? "reprovada" : "feita");
        break;
      case "task.done":
        set("feita");
        break;
      case "agent.start":
        agentTask.set(d.agent_id, e.task ?? "");
        agents.set(String(d.agent_id), {
          id: String(d.agent_id),
          role: roleOf(e.agent),
          task: e.task,
          since: e.ts,
        });
        break;
      case "agent.end":
        agents.delete(String(d.agent_id));
        break;
      case "usage": {
        if (seenMsg.has(d.message_id)) break;
        seenMsg.add(d.message_id);
        const usd = typeof d.usd === "number" ? d.usd : null;
        total = add(total, usd);
        const day = e.ts.slice(0, 10);
        if (usd !== null) byDay[day] = add(byDay[day], usd) ?? 0;
        if (sp) {
          sp.usd = add(sp.usd, usd);
          const tid = e.task ?? agentTask.get(d.agent_id) ?? null;
          const t = tid ? sp.tasks.get(tid) : undefined;
          if (t) t.usd = add(t.usd, usd);
        }
        break;
      }
    }
  }

  // PRD: agent started and not ended only counts as active for 30 min (crashed sessions)
  for (const [id, a] of agents)
    if (now.getTime() - Date.parse(a.since) > IDLE_MS) agents.delete(id);
  const list = [...sprints.values()];
  const active = list.filter((s) => s.status === "aberta").pop();
  const last = evs.at(-1)?.ts ?? null;
  return {
    v: 1,
    updated_at: now.toISOString(),
    project: {
      id: projectId,
      last_event_at: last,
      total_usd: total,
      parado: agents.size === 0 && (last === null || now.getTime() - Date.parse(last) > IDLE_MS),
    },
    sprint_active: active?.id ?? null,
    sprints: list.map(({ tasks, ...s }) => ({
      ...s,
      done: [...tasks.values()].filter((t) => t.status === "feita").length,
      total: Math.max(s.total, tasks.size),
    })),
    tasks: active ? [...active.tasks.values()] : [],
    agents: [...agents.values()],
    usd_by_day: byDay,
  };
}
