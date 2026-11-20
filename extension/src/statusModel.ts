// Pure status bar model (no vscode import): projects + states + workspace folders -> text/tooltip/command.
import type { ProjectInfo, StateResult } from "./store";
import type { Role } from "./types";

export interface StatusItem {
  text: string;
  tooltip: string;
  command: string;
}

// shortcut: lowercases on every OS; two folders differing only by case would collide, rare enough.
const norm = (p: string): string => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

const usd = (n: number | null | undefined): string =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "USD" })
    : "sem dado";

const LABELS: [Role, string][] = [
  ["tech-lead", "TL"],
  ["clone", "clone"],
  ["reviewer", "reviewer"],
];

export function buildStatus(
  projects: ProjectInfo[],
  states: Record<string, StateResult>,
  folders: string[],
): StatusItem | null {
  const wanted = new Set(folders.map(norm));
  const project = projects.find((p) => p.path !== undefined && wanted.has(norm(p.path)));
  if (!project) return null;

  const command = "harnessDash.open";
  const r = states[project.id];
  if (r?.kind !== "ok") {
    return { text: "$(pulse) Harness: sem dado", tooltip: `${project.name}: sem dado`, command };
  }
  const s = r.state;

  const parts = LABELS.flatMap(([role, label]) => {
    const n = s.agents.filter((a) => a.role === role).length;
    return n ? [`${label} ${n}`] : [];
  });
  const lastDay = Object.keys(s.usd_by_day).sort().pop();
  const text = parts.length
    ? `$(pulse) ${parts.join(" · ")}`
    : `$(pulse) parado · ${usd(lastDay ? s.usd_by_day[lastDay] : null)}`;

  const running = s.tasks.find((t) => t.status === "em andamento");
  const tooltip = [
    project.name,
    `Gasto total: ${usd(s.project.total_usd)}`,
    `Sprint ativa: ${s.sprint_active ?? "sem dado"}`,
    `Tarefa em andamento: ${running ? `${running.id}${running.title ? ` ${running.title}` : ""}` : "nenhuma"}`,
  ].join("\n");

  return { text, tooltip, command };
}
