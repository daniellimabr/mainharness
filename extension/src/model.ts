// Pure view-model for the panel (no vscode import). Missing data is "sem dado", never zero.
import type { Role, State, TaskStatus } from "./types";

export type StateInput =
  | { kind: "ok"; state: State }
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "newer"; v: number };

export interface ProjectInput {
  id: string;
  name: string;
  result: StateInput;
}

export const NO_DATA = "sem dado";
const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" });

export const formatUsd = (v: number | null | undefined): string =>
  typeof v === "number" && Number.isFinite(v) ? fmt.format(v) : NO_DATA;

/** "2026-11-20" -> "20/11" (string split: no timezone shift). */
export const formatDay = (d: string): string => {
  const [, m, day] = d.split("-");
  return m && day ? `${day}/${m}` : d;
};

export interface TaskRow {
  id: string;
  title: string;
  agent: string;
  role: Role;
  status: TaskStatus;
  usd: string;
}
export interface SprintRow {
  id: string;
  status: string;
  progress: string;
  usd: string;
  pct: number; // share of the largest sprint cost, for the bar
  active: boolean;
}
export interface AgentRow {
  id: string;
  role: Role;
  task: string;
}
export interface DayBar {
  day: string;
  usd: string;
  pct: number;
}
export interface ProjectView {
  id: string;
  name: string;
  usd: string;
  status: "ativo" | "parado" | NoData;
  last: string;
  note: string;
  sprintActive: string;
  sprints: SprintRow[];
  tasks: TaskRow[];
  agents: AgentRow[];
  days: DayBar[];
}
type NoData = typeof NO_DATA;
export interface ViewModel {
  total: string;
  projects: ProjectView[];
  activeAgents: number;
}

const NOTE: Record<string, string> = {
  missing: "Estado ainda não gerado para este projeto.",
  invalid: "Arquivo de estado inválido.",
  newer: "Estado em formato mais novo que a extensão; atualize a extensão.",
};

export function buildViewModel(inputs: ProjectInput[]): ViewModel {
  let sum = 0;
  let any = false;
  let activeAgents = 0;
  const projects = inputs.map((p): ProjectView => {
    const base = {
      id: p.id,
      name: p.name,
      usd: NO_DATA,
      status: NO_DATA as NoData,
      last: NO_DATA,
      note: NOTE[p.result.kind] ?? "",
      sprintActive: NO_DATA,
      sprints: [],
      tasks: [],
      agents: [],
      days: [],
    };
    if (p.result.kind !== "ok") return base;
    const s = p.result.state;
    const total = s.project.total_usd;
    if (typeof total === "number") {
      sum += total;
      any = true;
    }
    const byDay = Object.entries(s.usd_by_day ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const lastDay = byDay[byDay.length - 1];
    const max = Math.max(0, ...byDay.map(([, v]) => v));
    const maxSprint = Math.max(0, ...(s.sprints ?? []).map((x) => x.usd ?? 0));
    activeAgents += (s.agents ?? []).length;
    return {
      ...base,
      usd: formatUsd(total),
      status: s.project.parado ? "parado" : "ativo",
      last: lastDay ? `${formatDay(lastDay[0])}: ${formatUsd(lastDay[1])}` : NO_DATA,
      note: "",
      sprintActive: s.sprint_active ?? NO_DATA,
      sprints: (s.sprints ?? []).map((x) => ({
        id: x.id,
        status: x.status,
        progress: `${x.done}/${x.total}`,
        usd: formatUsd(x.usd),
        pct: maxSprint > 0 ? ((x.usd ?? 0) / maxSprint) * 100 : 0,
        active: x.id === s.sprint_active,
      })),
      tasks: (s.tasks ?? []).map((t) => ({
        id: t.id,
        title: t.title ?? NO_DATA,
        agent: t.agent ?? NO_DATA,
        role: t.role,
        status: t.status,
        usd: formatUsd(t.usd),
      })),
      agents: (s.agents ?? []).map((a) => ({ id: a.id, role: a.role, task: a.task ?? NO_DATA })),
      days: byDay.slice(-30).map(([d, v]) => ({
        day: formatDay(d),
        usd: formatUsd(v),
        pct: max > 0 ? (v / max) * 100 : 0,
      })),
    };
  });
  return { total: any ? formatUsd(sum) : NO_DATA, projects, activeAgents };
}
