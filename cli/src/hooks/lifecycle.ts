// Stop, SubagentStop, PreCompact and SessionEnd: usage ingestion and the managed 250K context cycle.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig } from "../core/config";
import { logError } from "../core/log";
import { resolveProject, type ProjectContext } from "../core/projects";
import { readJson } from "../core/fsx";
import { type ProjectState, readState, updateState } from "../core/state";
import { emit, readEvents } from "../events/emit";
import { ID_RE } from "../events/schema";
import { currentContextTokens, ingestSession } from "../usage/index";
import { refreshLimits } from "../usage/limits";
import { jsonOut, type HookInput, type HookOutcome } from "./runner";

/** Runtime state plus the compaction mark and the subagent tasks kept by this module. */
type State = ProjectState & { lastCompactAt?: string; agentTasks?: Record<string, string> };
const AGENT_TASKS_KEEP = 50;

interface Ctx {
  p: ProjectContext;
  st: State;
  session: string | null;
}

function context(input: HookInput): Ctx | null {
  const p = resolveProject(input.cwd || process.cwd());
  if (!p) return null;
  return { p, st: readState(p.id), session: input.session_id || null };
}

function ingest(input: HookInput, c: Ctx): void {
  if (!input.transcript_path || !input.session_id) return;
  try {
    ingestSession({
      transcriptPath: input.transcript_path,
      sessionId: input.session_id,
      project: c.p.id,
      sprint: c.st.activeSprint,
      task: currentTask(c.st),
      agentTasks: c.st.agentTasks,
    });
  } catch (err) {
    logError("hook ingest", err);
  }
}

function tokensOf(input: HookInput): number | null {
  return input.transcript_path ? currentContextTokens(input.transcript_path) : null;
}

const time = (s: string | undefined) => (s ? Date.parse(s) : NaN);

export type Exec = (cmd: string, args: string[]) => { status: number | null; stdout: string };

function execIn(root: string): Exec {
  return (cmd, args) => {
    // Missing local TypeScript must not block the Stop.
    if (cmd === process.execPath && !fs.existsSync(args[0] ?? ""))
      return { status: null, stdout: "" };
    const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", timeout: 60_000 });
    return { status: r.status, stdout: r.stdout ?? "" };
  };
}

/** tsc errors (first 20 lines) when cli/src changed in the harness repo; null otherwise. */
export function typecheckReason(root: string, exec: Exec = execIn(root)): string | null {
  if (!fs.existsSync(path.join(root, "cli", "tsconfig.json"))) return null;
  const changed = exec("git", ["status", "--porcelain"])
    .stdout.split("\n")
    .some((l) => l.slice(3).replace(/^"/, "").startsWith("cli/src/"));
  if (!changed) return null;
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  const r = exec(process.execPath, [tsc, "--noEmit", "-p", "cli"]);
  if (!r.status) return null; // 0 = ok; null = timeout or tsc missing
  const head = r.stdout.trim().split("\n").slice(0, 20).join("\n");
  return `Erros de tipo em cli/src (tsc --noEmit -p cli). Corrija antes de parar:\n${head}`;
}

export function stop(input: HookInput): HookOutcome {
  const c = context(input);
  if (!c) return {};
  ingest(input, c);
  const tokens = tokensOf(input);
  // B108: the Dashboard shows the current context size, not only the alert.
  if (tokens !== null)
    emit({
      type: "context",
      project: c.p.id,
      session: c.session,
      sprint: c.st.activeSprint,
      task: taskOf(input, c),
      data: {
        tokens,
        limit: loadConfig().contextLimit,
        last_compact_at: c.st.lastCompactAt ?? null,
      },
    });
  // B064: not awaited, so the Stop logic is unchanged; the process still exits only after the call (3 s max).
  void refreshLimits({ project: c.p.id, session: c.session, sprint: c.st.activeSprint });
  const block = stopBlock(input, c, tokens);
  if (block) return jsonOut({ decision: "block", ...block });
  // B045: the agent's turn really ended: the wait for Daniel starts here
  emit({
    type: "turn.end",
    project: c.p.id,
    session: c.session,
    sprint: c.st.activeSprint,
    data: {},
  });
  return {};
}

/** Reason (and message) to keep the agent going; null lets it stop. */
function stopBlock(
  input: HookInput,
  c: Ctx,
  tokens: number | null,
): { reason: string; systemMessage?: string } | null {
  const cfg = loadConfig();
  // Typecheck only in the harness repo itself, not in projects that happen to have cli/.
  if (!input.stop_hook_active && path.relative(c.p.root, cfg.harnessRepo) === "") {
    const reason = typecheckReason(c.p.root);
    if (reason) return { reason };
  }
  if (cfg.contextStrategy !== "compact" || input.stop_hook_active) return null;
  if (tokens === null || tokens < cfg.handoffAt) return null;
  const alerted = c.st.lastContextAlertAt;
  if (alerted && !(time(alerted) < time(c.st.lastCompactAt))) return null;
  emit({
    type: "alert.context",
    project: c.p.id,
    session: c.session,
    sprint: c.st.activeSprint,
    task: taskOf(input, c),
    data: { tokens, limit: cfg.contextLimit, handoff: false, agent_id: input.agent_id ?? null },
  });
  updateState(c.p.id, (s) => {
    s.lastContextAlertAt = new Date().toISOString();
  });
  const k = (n: number) => Math.round(n / 1000);
  return {
    reason:
      `Contexto em ${k(tokens)} mil tokens (limite ${k(cfg.contextLimit)} mil). ` +
      "Escreva agora o handoff com `hx handoff` (objetivo, tarefa atual, arquivos tocados, " +
      "decisões, próximos passos) e continue a tarefa.",
    systemMessage:
      "Contexto perto do limite: handoff pedido; a compactação automática vai liberar espaço.",
  };
}

/** The task in progress when exactly one is; null when none or several (parallel clones). */
export function currentTask(st: ProjectState): string | null {
  const open = Object.entries(st.tasks).filter(([, t]) => t.start && !t.end);
  return open.length === 1 ? (open[0]?.[0] ?? null) : null;
}

/** TNN in the Agent description ("T06 ...", "[T06] ..."), from the subagent's meta.json. */
function descriptionTask(input: HookInput): string | null {
  const { transcript_path: tp, session_id: sid, agent_id: id } = input;
  if (!tp || !sid || !id || !ID_RE.test(sid) || !ID_RE.test(id)) return null;
  const meta = readJson<{ description?: unknown }>(
    path.join(path.dirname(tp), sid, "subagents", `agent-${id}.meta.json`),
    {},
  );
  const d = meta && typeof meta.description === "string" ? meta.description : "";
  return /\b(T\d{2,3})\b/.exec(d)?.[1] ?? null;
}

/** Task of the hook's agent: the one recorded at its agent.start, else the single task in progress. */
function taskOf(input: HookInput, c: Ctx): string | null {
  return (input.agent_id && c.st.agentTasks?.[input.agent_id]) || currentTask(c.st);
}

function emitAgent(type: "agent.start" | "agent.end", input: HookInput, c: Ctx): void {
  if (!input.agent_id) return;
  const id = input.agent_id;
  const t = input.agent_type;
  const task =
    type === "agent.start" ? (descriptionTask(input) ?? currentTask(c.st)) : taskOf(input, c);
  if (type === "agent.start" && task)
    updateState(c.p.id, (s) => {
      const all = { ...(s as State).agentTasks, [id]: task };
      (s as State).agentTasks = Object.fromEntries(Object.entries(all).slice(-AGENT_TASKS_KEEP));
    });
  emit({
    type,
    project: c.p.id,
    session: c.session,
    sprint: c.st.activeSprint,
    task,
    agent: t && ID_RE.test(t) ? t : null,
    data: { agent_id: input.agent_id },
  });
}

export function subagentStart(input: HookInput): HookOutcome {
  const c = context(input);
  if (c) emitAgent("agent.start", input, c);
  return {};
}

export function subagentStop(input: HookInput): HookOutcome {
  const c = context(input);
  if (!c) return {};
  ingest(input, c);
  emitAgent("agent.end", input, c);
  return {};
}

export function preCompact(input: HookInput): HookOutcome {
  const c = context(input);
  if (!c) return {};
  const cfg = loadConfig();
  const lh = c.st.lastHandoff;
  const alerted = time(c.st.lastContextAlertAt);
  const fresh = lh && !lh.consumed && (isNaN(alerted) || time(lh.at) >= alerted - 1000);
  const base = { project: c.p.id, session: c.session, sprint: c.st.activeSprint };
  if (fresh) {
    // B132: one `handoff` event per file; `hx handoff` may have emitted it already.
    const file = path.basename(lh.file);
    if (
      !readEvents((e) => e.type === "handoff" && e.project === c.p.id && e.data.file === file)
        .length
    )
      emit({ ...base, type: "handoff", data: { mode: "compact", file } });
  } else {
    const data = {
      tokens: tokensOf(input) ?? 0,
      limit: cfg.contextLimit,
      handoff: false,
      agent_id: input.agent_id ?? null,
    };
    emit({ ...base, type: "alert.context", task: taskOf(input, c), data });
    emit({ ...base, type: "handoff", data: { mode: "compact", file: null } });
  }
  updateState(c.p.id, (s) => {
    (s as State).lastCompactAt = new Date().toISOString();
  });
  return {};
}

export function sessionEnd(input: HookInput): HookOutcome {
  const c = context(input);
  if (!c) return {};
  ingest(input, c);
  emit({
    type: "session.end",
    project: c.p.id,
    session: c.session,
    sprint: c.st.activeSprint,
    data: { reason: input.reason || "other" },
  });
  return {};
}
