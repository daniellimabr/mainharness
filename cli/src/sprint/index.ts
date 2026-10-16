// Sprint plan (docs/sprints/SNN-plan.md): parse the task table, approval hash, execution list, metrics.
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { TaskTimes } from "../core/state";
import { localDateTime, localHM } from "../core/time";
import { readEvents } from "../events/emit";
import type { HarnessEvent } from "../events/schema";

export interface PlanTask {
  id: string;
  title: string;
  agent: string;
  files: string;
  planned_min: number;
}

export interface Approval {
  approver: string;
  at: string;
  sha256: string;
}

export interface Plan {
  title: string;
  tasks: PlanTask[];
  /** null while the approval section still has placeholders. */
  approval: Approval | null;
  /** Execution lines by task id (empty when the section does not exist yet). */
  execution: Record<string, { done: boolean; line: string }>;
}

const APPROVAL_RE = /^## Aprovação/m;
const EXEC_HEADING = "## Execução";

export function planPath(projectRoot: string, sprintId: string): string {
  return path.join(projectRoot, "docs", "sprints", `${sprintId}-plan.md`);
}

/** Release Report of the sprint: holds the live execution table (the approved plan never changes). */
export function releasePath(projectRoot: string, sprintId: string): string {
  return path.join(projectRoot, "docs", "sprints", `${sprintId}-release.md`);
}

function releaseStub(sprintId: string): string {
  return (
    `# ${sprintId} — Release Report\n\n` +
    "> Sprint em andamento. A tabela de execução abaixo é atualizada pelo `hx` a cada tarefa; " +
    "o Tech Lead completa o restante no fechamento (skill release-report), mantendo esta tabela.\n\n"
  );
}

/** Execution rows recorded in the Release Report (empty when it does not exist yet). */
export function readExecution(projectRoot: string, sprintId: string): Plan["execution"] {
  const file = releasePath(projectRoot, sprintId);
  return fs.existsSync(file) ? parsePlan(fs.readFileSync(file, "utf8")).execution : {};
}

/** Creates/updates "## Execução" in docs/sprints/SNN-release.md. */
export function updateExecution(
  projectRoot: string,
  sprintId: string,
  tasks: PlanTask[],
  lineFor: (t: PlanTask) => string,
  times: Record<string, TaskTimes>,
): void {
  const file = releasePath(projectRoot, sprintId);
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : releaseStub(sprintId);
  writePlan(file, text, writeExecution(text, tasks, lineFor, times));
}

/** Path relative to the project, with forward slashes (for events). */
export function planRel(sprintId: string): string {
  return `docs/sprints/${sprintId}-plan.md`;
}

const lf = (text: string) => text.replace(/\r\n/g, "\n");

/** SHA-256 of everything before "## Aprovação", with LF line endings. */
export function planHash(text: string): string {
  const t = lf(text);
  const m = APPROVAL_RE.exec(t);
  return createHash("sha256")
    .update(m ? t.slice(0, m.index) : t)
    .digest("hex");
}

/** "20 min", "1 h", "1 h 30 min", "1h30" -> minutes. */
export function parseEstimate(s: string): number {
  const h = /(\d+(?:[.,]\d+)?)\s*h/i.exec(s);
  const m = /(\d+)\s*min/i.exec(s);
  return Math.round(
    (h ? Number((h[1] ?? "0").replace(",", ".")) * 60 : 0) + (m ? Number(m[1]) : 0),
  );
}

/** 20 -> "20 min", 60 -> "1 h", 90 -> "1 h 30 min". */
export function fmtMin(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Body of a "## Heading" section: [start, end) offsets of the heading line through the next "## ". */
function section(text: string, heading: RegExp): { start: number; end: number } | null {
  const m = heading.exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const next = /^## /m.exec(rest);
  return { start: m.index, end: next ? m.index + m[0].length + next.index : text.length };
}

/** Table cells; "\|" is a literal pipe inside a cell. */
const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||(?<!\\)\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));

export function parsePlan(text: string): Plan {
  const t = lf(text);
  const title = /^# (.+)$/m.exec(t)?.[1]?.trim() ?? "";
  const tasks: PlanTask[] = [];
  const tsec = section(t, /^## Tarefas[^\n]*$/m);
  if (tsec) {
    let estCol = 4; // template: Id | Tarefa | Agente | Arquivos | Estimativa
    for (const row of t.slice(tsec.start, tsec.end).split("\n")) {
      if (!row.trim().startsWith("|")) continue;
      const c = cells(row);
      const [id = "", title = "", agent = "", files = ""] = c;
      const head = c.findIndex((h) => /^(estimativa|planejado)$/i.test(h));
      if (/^id$/i.test(id) && head > 0) estCol = head;
      if (!/^T\d+/i.test(id)) continue; // header and separator rows
      const planned_min = parseEstimate(c[estCol] ?? "");
      tasks.push({ id: id.toUpperCase(), title, agent, files, planned_min });
    }
  }
  let approval: Approval | null = null;
  const asec = section(t, /^## Aprovação[^\n]*$/m);
  if (asec) {
    const body = t.slice(asec.start, asec.end);
    const sha = /`([0-9a-f]{64})`/.exec(body)?.[1];
    if (sha) {
      approval = {
        sha256: sha,
        approver: /\*\*Aprovado por:\*\*\s*(.+)/.exec(body)?.[1]?.trim() ?? "",
        at:
          /\*\*Data\/hora[^*]*\*\*.*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/.exec(body)?.[1] ?? "",
      };
    }
  }
  const execution: Plan["execution"] = {};
  const esec = section(t, /^## Execução[^\n]*$/m);
  if (esec) {
    for (const line of t.slice(esec.start, esec.end).split("\n")) {
      const row = /^\|\s*(\S+)\s*\|\s*(T\d+)\s*\|/.exec(line);
      if (row?.[2]) execution[row[2].toUpperCase()] = { done: row[1] === DONE, line };
      const legacy = /^- \[([ xX])\] (T\d+)\b/.exec(line);
      if (legacy?.[2]) execution[legacy[2].toUpperCase()] = { done: legacy[1] !== " ", line };
    }
  }
  return { title, tasks, approval, execution };
}

/** Rewrites the approval section with the given values (used when it still has placeholders). */
export function fillApproval(text: string, a: Approval, harness: string): string {
  const t = lf(text);
  const block =
    `## Aprovação\n\n` +
    `- **Aprovado por:** ${a.approver}\n` +
    `- **Data/hora:** ${localDateTime(a.at)} (horário de Brasília) — UTC ${a.at}\n` +
    `- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): \`${a.sha256}\`\n` +
    `- **Versão do harness:** ${harness}\n\n`;
  const sec = section(t, /^## Aprovação[^\n]*$/m);
  const out = sec
    ? t.slice(0, sec.start) + block + t.slice(sec.end)
    : t.replace(/\n*$/, "\n\n") + block;
  return out.replace(/\n+$/, "\n");
}

const DONE = "✅";
const DOING = "🔄";
const TODO = "⬜";
const EXEC_HEADER =
  "| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |\n" +
  "|---|---|---|---|---|---|---|---|";
const EXEC_NOTE = "Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.";

/** One execution table row for a task, from its recorded times. */
export function taskLine(t: PlanTask, times?: TaskTimes): string {
  const title = t.title.replace(/\|/g, "/");
  const row = (status: string, start = "", end = "", dur = "") =>
    `| ${status} | ${t.id} | ${title} | ${t.agent} | ${fmtMin(t.planned_min)} | ${start} | ${end} | ${dur} |`;
  if (times?.end) {
    const start = times.start ?? times.end;
    return row(DONE, localHM(start), localHM(times.end), fmtMin((times.duration_s ?? 0) / 60));
  }
  if (times?.start) return row(DOING, localHM(times.start));
  return row(TODO);
}

const TOTAL = "**Total**";
const dateHM = (iso: string) => localDateTime(iso).slice(0, 16);

/** Sprint total row: planned sum, first start, last end and wall-clock duration once all are done. */
export function totalLine(tasks: PlanTask[], times: Record<string, TaskTimes>): string {
  const ts = tasks.map((t) => times[t.id] ?? {});
  const starts = ts.flatMap((x) => x.start ?? x.end ?? []).sort();
  const done = ts.every((x) => x.end);
  const start = starts[0] ?? "";
  const end = done
    ? (ts
        .map((x) => x.end ?? "")
        .sort()
        .at(-1) ?? "")
    : "";
  const status = done ? DONE : start ? DOING : TODO;
  const dur = end ? fmtMin((Date.parse(end) - Date.parse(start)) / 60000) : "";
  const planned = fmtMin(tasks.reduce((s, t) => s + t.planned_min, 0));
  return `| ${status} | ${TOTAL} | ${tasks.length} tarefas |  | ${planned} | ${start && dateHM(start)} | ${end && dateHM(end)} | ${dur} |`;
}

function execTable(lines: string[], total: string): string {
  return `${EXEC_NOTE}\n\n${EXEC_HEADER}\n${lines.join("\n")}\n${total}`;
}

/** Creates or updates "## Execução" (after the approval section, outside the hash). */
export function writeExecution(
  text: string,
  tasks: PlanTask[],
  lineFor: (t: PlanTask) => string,
  times: Record<string, TaskTimes> = {},
): string {
  const t = lf(text);
  const block = `${EXEC_HEADING}\n\n${execTable(tasks.map(lineFor), totalLine(tasks, times))}\n\n`;
  const sec = section(t, /^## Execução[^\n]*$/m);
  const out = sec
    ? t.slice(0, sec.start) + block + t.slice(sec.end)
    : t.replace(/\n*$/, "\n\n") + block;
  return out.replace(/\n+$/, "\n");
}

/** Keeps the file's original line endings when writing. */
export function writePlan(file: string, original: string, next: string): void {
  fs.writeFileSync(file, original.includes("\r\n") ? next.replace(/\n/g, "\r\n") : next);
}

/** Compact task list to republish in chat. Empty string when the plan does not exist. */
export function renderTaskList(projectRoot: string, sprintId: string): string {
  const file = planPath(projectRoot, sprintId);
  if (!fs.existsSync(file)) return "";
  const plan = parsePlan(fs.readFileSync(file, "utf8"));
  plan.execution = readExecution(projectRoot, sprintId);
  const lines = plan.tasks.map((t) => {
    const line = plan.execution[t.id]?.line;
    return line?.startsWith("|") ? line : taskLine(t);
  });
  const done = plan.tasks.filter((t) => plan.execution[t.id]?.done).length;
  const rel = releasePath(projectRoot, sprintId);
  const stored = fs.existsSync(rel)
    ? lf(fs.readFileSync(rel, "utf8"))
        .split("\n")
        .find((l) => l.includes(`| ${TOTAL} |`))
    : undefined;
  const total = stored ?? totalLine(plan.tasks, {});
  return `Sprint ${sprintId} — ${done}/${plan.tasks.length} feitas\n\n${execTable(lines, total)}`;
}

export interface SprintMetrics {
  tasks_total: number;
  tasks_done: number;
  planned_min: number;
  actual_min: number;
  tokens_input: number;
  tokens_output: number;
  tokens_cache_write: number;
  tokens_cache_read: number;
  usd: number;
  rework: number;
  review_rejections: number;
  context_alerts: number;
  handoffs: number;
  usd_by_agent: Record<string, number>;
  usd_by_task: Record<string, number>;
  actual_min_by_task: Record<string, number>;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Sprint indicators from the project's events and the plan. */
export function computeMetrics(project: string, sprintId: string, plan: Plan): SprintMetrics {
  const evs: HarnessEvent[] = readEvents((e) => e.project === project && e.sprint === sprintId);
  const durations: Record<string, number> = {};
  for (const e of evs)
    if (e.type === "task.done" && e.task) durations[e.task] = num(e.data.duration_s);
  const actual_min_by_task: Record<string, number> = {};
  for (const [k, s] of Object.entries(durations)) actual_min_by_task[k] = r1(s / 60);
  const m: SprintMetrics = {
    tasks_total: plan.tasks.length,
    tasks_done: plan.tasks.filter((t) => t.id in durations).length,
    planned_min: plan.tasks.reduce((a, t) => a + t.planned_min, 0),
    actual_min: r1(Object.values(durations).reduce((a, s) => a + s, 0) / 60),
    tokens_input: 0,
    tokens_output: 0,
    tokens_cache_write: 0,
    tokens_cache_read: 0,
    usd: 0,
    rework: 0,
    review_rejections: 0,
    context_alerts: 0,
    handoffs: 0,
    usd_by_agent: {},
    usd_by_task: {},
    actual_min_by_task,
  };
  for (const e of evs) {
    const d = e.data;
    if (e.type === "usage") {
      m.tokens_input += num(d.input);
      m.tokens_output += num(d.output);
      m.tokens_cache_write += num(d.cache_write);
      m.tokens_cache_read += num(d.cache_read);
      const usd = num(d.usd);
      m.usd += usd;
      const agent = e.agent ?? "desconhecido";
      const task = e.task ?? "sem-tarefa";
      m.usd_by_agent[agent] = (m.usd_by_agent[agent] ?? 0) + usd;
      m.usd_by_task[task] = (m.usd_by_task[task] ?? 0) + usd;
    } else if (e.type === "sprint.feedback") m.rework += num(d.adjustments);
    else if (e.type === "review.result" && d.result === "fail") m.review_rejections++;
    else if (e.type === "alert.context") m.context_alerts++;
    else if (e.type === "handoff") m.handoffs++;
  }
  m.usd = r4(m.usd);
  for (const rec of [m.usd_by_agent, m.usd_by_task])
    for (const [k, v] of Object.entries(rec)) rec[k] = r4(v);
  return m;
}

const usd = (x: number) => `US$ ${x.toFixed(2)}`;
const tok = (x: number) => x.toLocaleString("pt-BR");

/** Markdown indicators block (goes into the Release Report). */
export function renderMetrics(sprintId: string, plan: Plan, m: SprintMetrics): string {
  const rows = plan.tasks.map((t) => {
    const a = m.actual_min_by_task[t.id];
    const diff =
      a === undefined
        ? "—"
        : `${a - t.planned_min >= 0 ? "+" : "−"}${fmtMin(Math.abs(a - t.planned_min))}`;
    const cost = m.usd_by_task[t.id];
    return `| ${t.id} | ${fmtMin(t.planned_min)} | ${a === undefined ? "—" : fmtMin(a)} | ${diff} | ${cost === undefined ? "—" : usd(cost)} |`;
  });
  const byAgent =
    Object.entries(m.usd_by_agent)
      .map(([k, v]) => `${k} ${usd(v)}`)
      .join(" · ") || "—";
  return [
    `### Indicadores — ${sprintId}`,
    "",
    "| Tarefa | Planejado | Real | Diferença | Custo |",
    "|---|---|---|---|---|",
    ...rows,
    `| **Total** | ${fmtMin(m.planned_min)} | ${fmtMin(m.actual_min)} | | ${usd(m.usd)} |`,
    "",
    "| Indicador | Valor |",
    "|---|---|",
    `| Tarefas feitas | ${m.tasks_done}/${m.tasks_total} |`,
    `| Tokens (entrada / saída / escrita em cache / leitura de cache) | ${tok(m.tokens_input)} / ${tok(m.tokens_output)} / ${tok(m.tokens_cache_write)} / ${tok(m.tokens_cache_read)} |`,
    `| Custo total | ${usd(m.usd)} |`,
    `| Custo por agente | ${byAgent} |`,
    `| Retrabalho (ajustes pedidos por Daniel) | ${m.rework} |`,
    `| Reprovações do Reviewer | ${m.review_rejections} |`,
    `| Alertas de contexto | ${m.context_alerts} |`,
    `| Handoffs | ${m.handoffs} |`,
  ].join("\n");
}
