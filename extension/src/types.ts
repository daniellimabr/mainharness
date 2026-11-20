// state.json v1 (docs/contracts/state.md). Copied on purpose: the extension does not import from cli/.
export type Role = "tech-lead" | "clone" | "reviewer";
export type TaskStatus = "a fazer" | "em andamento" | "em revisão" | "feita" | "reprovada";

export interface StateSprint {
  id: string;
  status: "aberta" | "fechada";
  done: number;
  total: number;
  usd: number | null;
}

export interface StateTask {
  id: string;
  title: string | null;
  status: TaskStatus;
  agent: string | null;
  role: Role;
  usd: number | null;
}

export interface StateAgent {
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
  sprints: StateSprint[];
  tasks: StateTask[];
  agents: StateAgent[];
  usd_by_day: Record<string, number>;
}
