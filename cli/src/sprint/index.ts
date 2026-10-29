// Sprint plan (docs/sprints/SNN-plan.md): parse the task table, approval hash, execution list, metrics.
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveProject } from "../core/projects";
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
  /** Ids from "Depende de"; undefined when the plan has no such column. */
  deps?: string[];
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
  const a = activity(resolveProject(projectRoot)?.id ?? "");
  const line = (t: PlanTask) => {
    const x = times[t.id];
    if (!x?.start || !x.end) return lineFor(t);
    const passes = [...earlierPasses(a, sprintId, t.id, x.start), [x.start, x.end]];
    let min = 0;
    let review: number | undefined;
    let queue: number | undefined;
    for (const [s = "", e = ""] of passes) {
      const tt = taskTime(a, t.id, Date.parse(s), Date.parse(e));
      if (tt.review !== undefined) review = (review ?? 0) + tt.review;
      if (tt.queue !== undefined) queue = (queue ?? 0) + tt.queue;
      min += tt.min;
    }
    return taskLine(t, { ...x, start: passes[0]?.[0], duration_s: min * 60 }, review, queue);
  };
  // Total row starts at each task's first pass
  const firstTimes = Object.fromEntries(
    Object.entries(times).map(([id, x]) => [
      id,
      x.start ? { ...x, start: earlierPasses(a, sprintId, id, x.start)[0]?.[0] ?? x.start } : x,
    ]),
  );
  const last = a.times.at(-1) ?? 0;
  // forecast: pauses so far, up to the last recorded event
  const pause = (from: number, to: number) => pauseMs(a.times, from, Math.min(to, last));
  const rounds = feedbackRounds(a.evs.filter((e) => e.sprint === sprintId)).map((r) =>
    roundLine(r, a),
  );
  writePlan(file, text, writeExecution(text, tasks, line, firstTimes, pause, rounds));
}

/** B053: [start, end] of a task's passes closed before `before` (state keeps only the current one). */
function earlierPasses(a: Activity, sprint: string, task: string, before: string): string[][] {
  return a.evs
    .filter(
      (e) =>
        e.type === "task.done" &&
        e.sprint === sprint &&
        e.task === task &&
        Date.parse(e.ts) < Date.parse(before),
    )
    .map((e) => [new Date(Date.parse(e.ts) - num(e.data.duration_s) * 1000).toISOString(), e.ts]);
}

const PAUSE_MS = 30 * 60000;

/** B037: total of the gaps longer than 30 min without any event, inside [from, to] (ms). */
export function pauseMs(evTimes: number[], from: number, to: number): number {
  if (!(to > from)) return 0;
  const pts = [from, to, ...evTimes.filter((t) => t > from && t < to)].sort((x, y) => x - y);
  let p = 0;
  for (let i = 1; i < pts.length; i++) {
    const gap = (pts[i] ?? 0) - (pts[i - 1] ?? 0);
    if (gap > PAUSE_MS) p += gap;
  }
  return p;
}

interface Activity {
  /** All events of the project, by time. */
  evs: HarnessEvent[];
  times: number[];
}

function activity(project: string): Activity {
  const evs = readEvents((e) => e.project === project).sort(
    (x, y) => Date.parse(x.ts) - Date.parse(y.ts),
  );
  return { evs, times: evs.map((e) => Date.parse(e.ts)) };
}

/**
 * Task minutes net of pauses; with a "revisão" phase (B060), minutes until delivery plus the review
 * after it. With a "fila" phase (B068), delivery is the fila and the wait until "revisão" is the queue.
 */
function taskTime(a: Activity, task: string, start: number, end: number) {
  const net = (to: number) => (to - start - pauseMs(a.times, start, to)) / 60000;
  // last delivery: fixes after a rejection are the clone's work, not review
  const last = (phase: string, from = start) =>
    [...a.evs]
      .reverse()
      .find(
        (e) =>
          e.type === "task.phase" &&
          e.task === task &&
          e.data.phase === phase &&
          Date.parse(e.ts) >= from &&
          Date.parse(e.ts) <= end,
      );
  const q = last("fila");
  const ph = last("revisão", q ? Date.parse(q.ts) : start);
  if (q) {
    const delivered = net(Date.parse(q.ts));
    const reviewAt = ph ? net(Date.parse(ph.ts)) : net(end);
    const review = ph ? net(end) - reviewAt : undefined;
    return { min: delivered, queue: reviewAt - delivered, review };
  }
  if (!ph) return { min: net(end), queue: undefined, review: undefined };
  const delivered = net(Date.parse(ph.ts));
  return { min: delivered, queue: undefined, review: net(end) - delivered };
}

/** " (fila: X, revisão: Y)" suffix for a task duration; empty when neither exists. */
function partsSuffix(queue?: number, review?: number): string {
  const parts = [
    queue === undefined ? "" : `fila: ${fmtMin(queue)}`,
    review === undefined ? "" : `revisão: ${fmtMin(review)}`,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

export interface Round {
  n: number;
  adjustments: number;
  start: string;
  /** Next feedback or sprint close; undefined while open. */
  end?: string;
}

/** B040: each "sprint feedback N" (N > 0) opens a round, closed by the next feedback or the close. */
export function feedbackRounds(sprintEvs: HarnessEvent[]): Round[] {
  const out: Round[] = [];
  for (const e of sprintEvs) {
    if (e.type !== "sprint.feedback" && e.type !== "sprint.close") continue;
    const last = out.at(-1);
    if (last && !last.end) last.end = e.ts;
    const n = num(e.data.adjustments);
    if (e.type === "sprint.feedback" && n > 0)
      out.push({ n: out.length + 1, adjustments: n, start: e.ts });
  }
  return out;
}

/** Round minutes (net of pauses) and cost (usage inside it); an open round runs to the last event. */
function roundStats(r: Round, a: Activity): { min: number; usd: number } {
  const s = Date.parse(r.start);
  const e = r.end ? Date.parse(r.end) : Math.max(s, a.times.at(-1) ?? s);
  const seen = new Set<unknown>(); // a re-emitted response counts once
  const usd = a.evs
    .filter((x) => x.type === "usage" && Date.parse(x.ts) >= s && Date.parse(x.ts) < e)
    .reduce((acc, x) => {
      const id = x.data.message_id;
      if (id !== undefined && seen.has(id)) return acc;
      seen.add(id);
      return acc + num(x.data.usd);
    }, 0);
  return { min: (e - s - pauseMs(a.times, s, e)) / 60000, usd };
}

function roundLine(r: Round, a: Activity): string {
  const head = `| ${r.end ? DONE : DOING} | Ajuste ${r.n} | ${r.adjustments} ajuste(s) |  |  | ${localHM(r.start)} |`;
  return r.end ? `${head} ${localHM(r.end)} | ${fmtMin(roundStats(r, a).min)} |` : `${head}  |  |`;
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

/** "T03, T04" -> [T03, T04]; "T01–T03" -> [T01, T02, T03]; "—" -> []. */
function parseDeps(cell: string): string[] {
  const out: string[] = [];
  const id = (n: number, w: number) => `T${String(n).padStart(w, "0")}`;
  for (const m of cell.matchAll(/T(\d+)(?:\s*[–-]\s*T?(\d+))?/gi)) {
    const a = Number(m[1]);
    const b = m[2] ? Math.min(Number(m[2]), a + 99) : a; // cap absurd ranges
    for (let n = a; n <= b; n++) out.push(id(n, m[1]?.length ?? 2));
  }
  return out;
}

/** Expected wall clock: longest dependency chain; without a "Depende de" column, the plain sum. */
export function plannedWall(tasks: PlanTask[]): number {
  if (tasks.some((t) => !t.deps)) return tasks.reduce((a, t) => a + t.planned_min, 0);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const memo = new Map<string, number>();
  const finish = (t: PlanTask, seen: Set<string>): number => {
    const known = memo.get(t.id);
    if (known !== undefined) return known;
    if (seen.has(t.id)) return 0; // cycle in the plan: stop counting
    seen.add(t.id);
    let start = 0;
    for (const d of t.deps ?? []) {
      const dt = byId.get(d);
      if (dt && dt !== t) start = Math.max(start, finish(dt, seen));
    }
    const end = start + t.planned_min;
    memo.set(t.id, end);
    return end;
  };
  return Math.max(0, ...tasks.map((t) => finish(t, new Set())));
}

export function parsePlan(text: string): Plan {
  const t = lf(text);
  const title = /^# (.+)$/m.exec(t)?.[1]?.trim() ?? "";
  const tasks: PlanTask[] = [];
  const tsec = section(t, /^## Tarefas[^\n]*$/m);
  if (tsec) {
    let estCol = 4; // template: Id | Tarefa | Agente | Arquivos | Estimativa
    let depCol = -1;
    for (const row of t.slice(tsec.start, tsec.end).split("\n")) {
      if (!row.trim().startsWith("|")) continue;
      const c = cells(row);
      const [id = "", title = "", agent = "", files = ""] = c;
      if (/^id$/i.test(id)) {
        const head = c.findIndex((h) => /^(estimativa|planejado)$/i.test(h));
        if (head > 0) estCol = head;
        depCol = c.findIndex((h) => /^depende de$/i.test(h));
      }
      if (!/^T\d+/i.test(id)) continue; // header and separator rows
      const planned_min = parseEstimate(c[estCol] ?? "");
      const task: PlanTask = { id: id.toUpperCase(), title, agent, files, planned_min };
      if (depCol > 0) task.deps = parseDeps(c[depCol] ?? "");
      tasks.push(task);
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
      const row = /^\|\s*(\S+)[^|]*\|\s*(T\d+)\s*\|/.exec(line);
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
export function taskLine(
  t: PlanTask,
  times?: TaskTimes,
  reviewMin?: number,
  queueMin?: number,
): string {
  const title = t.title.replace(/\|/g, "/");
  const row = (status: string, start = "", end = "", dur = "") =>
    `| ${status} | ${t.id} | ${title} | ${t.agent} | ${fmtMin(t.planned_min)} | ${start} | ${end} | ${dur} |`;
  if (times?.end) {
    const start = times.start ?? times.end;
    const dur = fmtMin((times.duration_s ?? 0) / 60) + partsSuffix(queueMin, reviewMin);
    return row(DONE, localHM(start), localHM(times.end), dur);
  }
  if (times?.start)
    return row(times.phase ? `${DOING} ${times.phase}` : DOING, localHM(times.start));
  return row(TODO);
}

const TOTAL = "**Total**";
const dateHM = (iso: string) => localDateTime(iso).slice(0, 16);

/**
 * Sprint total row: planned wall clock, first start, last end and wall clock net of pauses once all
 * are done; before that, Fim is the forecast (start + planned + pauses so far).
 */
export function totalLine(
  tasks: PlanTask[],
  times: Record<string, TaskTimes>,
  pause: (from: number, to: number) => number = () => 0,
): string {
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
  const s = Date.parse(start);
  let fim = "";
  let dur = "";
  if (end) {
    const p = pause(s, Date.parse(end));
    fim = dateHM(end);
    dur = fmtMin((Date.parse(end) - s - p) / 60000) + (p ? ` (pausas: ${fmtMin(p / 60000)})` : "");
  } else if (start) {
    const f = dateHM(new Date(s + plannedWall(tasks) * 60000 + pause(s, Infinity)).toISOString());
    fim = `~${f.slice(0, 10) === dateHM(start).slice(0, 10) ? f.slice(11) : f} (previsto)`;
  }
  const planned = fmtMin(plannedWall(tasks));
  return `| ${status} | ${TOTAL} | ${tasks.length} tarefas |  | ${planned} | ${start && dateHM(start)} | ${fim} | ${dur} |`;
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
  pause?: (from: number, to: number) => number,
  rounds: string[] = [],
): string {
  const t = lf(text);
  const lines = [...tasks.map(lineFor), ...rounds];
  const block = `${EXEC_HEADING}\n\n${execTable(lines, totalLine(tasks, times, pause))}\n\n`;
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
  const stored = fs.existsSync(rel) ? lf(fs.readFileSync(rel, "utf8")).split("\n") : [];
  const rounds = stored.filter((l) => /^\| \S+ \| Ajuste \d+ \|/.test(l));
  const total = stored.find((l) => l.includes(`| ${TOTAL} |`)) ?? totalLine(plan.tasks, {});
  return `Sprint ${sprintId} — ${done}/${plan.tasks.length} feitas\n\n${execTable([...lines, ...rounds], total)}`;
}

export interface SprintMetrics {
  tasks_total: number;
  tasks_done: number;
  planned_min: number;
  /** Expected wall clock from the plan's dependencies (plannedWall). */
  planned_wall_min: number;
  actual_min: number;
  /** Wall clock: first task.start to last task.done. */
  wall_min: number;
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
  /** B037: gaps over 30 min without events, left out of wall_min and the task times. */
  pause_min: number;
  /** B060: minutes from the last "revisão" phase (delivery) to done; actual_min_by_task stops at delivery. */
  review_min_by_task: Record<string, number>;
  /** B068: minutes from the last "fila" phase (delivery) to "revisão". */
  queue_min_by_task?: Record<string, number>;
  /** B040: feedback rounds (count, time net of pauses, cost). */
  feedback_rounds: number;
  feedback_min: number;
  feedback_usd: number;
  /** B045: turn.end → next prompt of the same session (overlaps merged). */
  wait_min: number;
  /** B045: wall_min minus the waits inside it that are not already pauses. */
  work_min: number;
  /** T05: cost, tokens and distinct models from the usage events. */
  usd_by_model: Record<string, number>;
  tokens_by_model: Record<string, Record<string, number>>;
  models_by_task: Record<string, string[]>;
  /** T08: usage responses per task, and cost per executor (Haiku, Sonnet, Opus by model name). */
  calls_by_task: Record<string, number>;
  usd_by_executor: Record<string, number>;
}

/** B045: wait intervals [turn end, next prompt] per session, overlaps merged, sorted. */
function waitIntervals(evs: HarnessEvent[]): number[][] {
  const out: number[][] = [];
  const turnEnd = new Map<string | null, number>();
  for (const e of evs) {
    if (e.type === "turn.end") turnEnd.set(e.session, Date.parse(e.ts));
    else if (e.type === "prompt") {
      const t = turnEnd.get(e.session);
      if (t !== undefined) out.push([t, Date.parse(e.ts)]);
      turnEnd.delete(e.session);
    }
  }
  out.sort((x, y) => (x[0] ?? 0) - (y[0] ?? 0));
  const merged: number[][] = [];
  for (const [s = 0, e = 0] of out) {
    const prev = merged.at(-1);
    if (prev && s <= (prev[1] ?? 0)) prev[1] = Math.max(prev[1] ?? 0, e);
    else merged.push([s, e]);
  }
  return merged;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Sprint indicators from the project's events and the plan. */
export function computeMetrics(project: string, sprintId: string, plan: Plan): SprintMetrics {
  const a = activity(project);
  const evs = a.evs.filter((e) => e.sprint === sprintId);
  const durations: Record<string, number> = {};
  const review_min_by_task: Record<string, number> = {};
  const queue_min_by_task: Record<string, number> = {};
  for (const e of evs)
    if (e.type === "task.done" && e.task) {
      const end = Date.parse(e.ts);
      const tt = taskTime(a, e.task, end - num(e.data.duration_s) * 1000, end);
      const prior = durations[e.task] ?? 0; // B053: a reopened task sums its passes
      durations[e.task] = prior + tt.min * 60;
      if (tt.review !== undefined)
        review_min_by_task[e.task] = r1((review_min_by_task[e.task] ?? 0) + tt.review);
      if (tt.queue !== undefined)
        queue_min_by_task[e.task] = r1((queue_min_by_task[e.task] ?? 0) + tt.queue);
    }
  const actual_min_by_task: Record<string, number> = {};
  for (const [k, s] of Object.entries(durations)) actual_min_by_task[k] = r1(s / 60);
  const rounds = feedbackRounds(evs).map((r) => roundStats(r, a));
  const m: SprintMetrics = {
    tasks_total: plan.tasks.length,
    tasks_done: plan.tasks.filter((t) => t.id in durations).length,
    planned_min: plan.tasks.reduce((a, t) => a + t.planned_min, 0),
    planned_wall_min: plannedWall(plan.tasks),
    actual_min: r1(Object.values(durations).reduce((a, s) => a + s, 0) / 60),
    wall_min: 0,
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
    pause_min: 0,
    review_min_by_task,
    queue_min_by_task,
    feedback_rounds: rounds.length,
    feedback_min: r1(rounds.reduce((acc, r) => acc + r.min, 0)),
    feedback_usd: r4(rounds.reduce((acc, r) => acc + r.usd, 0)),
    wait_min: 0,
    work_min: 0,
    usd_by_model: {},
    tokens_by_model: {},
    models_by_task: {},
    calls_by_task: {},
    usd_by_executor: {},
  };
  const waits = waitIntervals(evs);
  m.wait_min = r1(waits.reduce((acc, [s = 0, e = 0]) => acc + e - s, 0) / 60000);
  const seenMsg = new Set<unknown>(); // a deleted usage-cache re-emits old responses
  for (const e of evs) {
    const d = e.data;
    if (e.type === "usage") {
      if (d.message_id !== undefined && seenMsg.has(d.message_id)) continue;
      seenMsg.add(d.message_id);
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
      const model =
        String(d.model ?? "desconhecido")
          .replace(/[^A-Za-z0-9._:@-]/g, "_")
          .slice(0, 128) || "desconhecido";
      m.usd_by_model[model] = (m.usd_by_model[model] ?? 0) + usd;
      const tk = (m.tokens_by_model[model] ??= {
        input: 0,
        output: 0,
        cache_write: 0,
        cache_read: 0,
      });
      for (const k of ["input", "output", "cache_write", "cache_read"])
        tk[k] = (tk[k] ?? 0) + num(d[k]);
      m.calls_by_task[task] = (m.calls_by_task[task] ?? 0) + 1;
      const fam = /haiku|sonnet|opus/i.exec(model)?.[0].toLowerCase();
      const exec = fam ? fam[0]?.toUpperCase() + fam.slice(1) : "Outro";
      m.usd_by_executor[exec] = (m.usd_by_executor[exec] ?? 0) + usd;
      const ms = (m.models_by_task[task] ??= []);
      if (!ms.includes(model)) ms.push(model);
    } else if (e.type === "sprint.feedback") m.rework += num(d.adjustments);
    else if (e.type === "review.result" && d.result === "fail") m.review_rejections++;
    else if (e.type === "alert.context") m.context_alerts++;
    else if (e.type === "handoff") m.handoffs++;
  }
  m.usd = r4(m.usd);
  for (const rec of [m.usd_by_agent, m.usd_by_task, m.usd_by_model, m.usd_by_executor])
    for (const [k, v] of Object.entries(rec)) rec[k] = r4(v);
  for (const ms of Object.values(m.models_by_task)) ms.sort();
  const ts = (type: string) =>
    evs
      .filter((e) => e.type === type)
      .map((e) => Date.parse(e.ts))
      .sort((a, b) => a - b);
  const starts = ts("task.start");
  const ends = ts("task.done");
  const first = starts[0] ?? ends[0];
  const last = ends.at(-1);
  if (first !== undefined && last !== undefined) {
    const p = pauseMs(a.times, first, last);
    m.pause_min = r1(p / 60000);
    m.wall_min = r1((last - first - p) / 60000);
    let busy = 0; // waits inside the wall clock, net of what pauses already took out
    for (const [ws = 0, we = 0] of waits) {
      const s = Math.max(ws, first);
      const e = Math.min(we, last);
      if (e > s) busy += e - s - pauseMs(a.times, s, e);
    }
    m.work_min = r1((last - first - p - busy) / 60000);
  }
  return m;
}

const usd = (x: number) => `US$ ${x.toFixed(2)}`;
const tok = (x: number) => x.toLocaleString("pt-BR");

const joinUsd = (r: Record<string, number> = {}) =>
  Object.entries(r)
    .map(([k, v]) => `${k} ${usd(v)}`)
    .join(" · ") || "—";

/** Markdown indicators block (goes into the Release Report). */
export function renderMetrics(sprintId: string, plan: Plan, m: SprintMetrics): string {
  const rows = plan.tasks.map((t) => {
    const a = m.actual_min_by_task[t.id];
    const diff =
      a === undefined
        ? "—"
        : `${a - t.planned_min >= 0 ? "+" : "−"}${fmtMin(Math.abs(a - t.planned_min))}`;
    const cost = m.usd_by_task[t.id];
    const parts = partsSuffix(m.queue_min_by_task?.[t.id], m.review_min_by_task[t.id]);
    const real = a === undefined ? "—" : fmtMin(a) + parts;
    return `| ${t.id} | ${fmtMin(t.planned_min)} | ${real} | ${diff} | ${cost === undefined ? "—" : usd(cost)} |`;
  });
  const byAgent =
    Object.entries(m.usd_by_agent)
      .map(([k, v]) => `${k} ${usd(v)}`)
      .join(" · ") || "—";
  const byModel =
    Object.entries(m.usd_by_model)
      .map(([k, v]) => `${k} ${usd(v)}`)
      .join(" · ") || "—";
  const tokByModel =
    Object.entries(m.tokens_by_model)
      .map(
        ([k, t]) =>
          `${k} ${tok(t.input ?? 0)} / ${tok(t.output ?? 0)} / ${tok(t.cache_write ?? 0)} / ${tok(t.cache_read ?? 0)}`,
      )
      .join(" · ") || "—";
  return [
    `### Indicadores — ${sprintId}`,
    "",
    "| Tarefa | Planejado | Real | Diferença | Custo |",
    "|---|---|---|---|---|",
    ...rows,
    `| **Total** | ${fmtMin(m.planned_min)} | ${fmtMin(m.actual_min)} (soma) | | ${usd(m.usd)} |`,
    "",
    "| Indicador | Valor |",
    "|---|---|",
    `| Tempo de relógio (previsto · corrido) | ${fmtMin(m.planned_wall_min)} · ${fmtMin(m.wall_min)} |`,
    `| Pausas (mais de 30 min sem eventos, fora do corrido) | ${fmtMin(m.pause_min)} |`,
    `| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | ${fmtMin(m.wait_min)} · ${fmtMin(m.work_min)} |`,
    `| Soma das tarefas (planejada · real) | ${fmtMin(m.planned_min)} · ${fmtMin(m.actual_min)} |`,
    `| Tarefas feitas | ${m.tasks_done}/${m.tasks_total} |`,
    `| Tokens (entrada / saída / escrita em cache / leitura de cache) | ${tok(m.tokens_input)} / ${tok(m.tokens_output)} / ${tok(m.tokens_cache_write)} / ${tok(m.tokens_cache_read)} |`,
    `| Custo total | ${usd(m.usd)} |`,
    `| Custo por agente | ${byAgent} |`,
    `| Custo por executor | ${joinUsd(m.usd_by_executor)} |`,
    `| Chamadas por tarefa | ${
      Object.entries(m.calls_by_task ?? {})
        .map(([k, v]) => `${k} ${v}`)
        .join(" · ") || "—"
    } |`,
    `| Custo por modelo | ${byModel} |`,
    `| Tokens por modelo (entrada / saída / escrita em cache / leitura de cache) | ${tokByModel} |`,
    `| Retrabalho (ajustes pedidos por Daniel) | ${m.rework} |`,
    `| Rodadas de ajuste (quantidade · tempo · custo) | ${m.feedback_rounds} · ${fmtMin(m.feedback_min)} · ${usd(m.feedback_usd)} |`,
    `| Reprovações do Reviewer | ${m.review_rejections} |`,
    `| Alertas de contexto | ${m.context_alerts} |`,
    `| Handoffs | ${m.handoffs} |`,
  ].join("\n");
}
