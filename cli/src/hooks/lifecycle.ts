// Stop, SubagentStop, PreCompact and SessionEnd: usage ingestion and the managed 250K context cycle.
import * as path from "node:path";
import { loadConfig } from "../core/config";
import { logError } from "../core/log";
import { resolveProject, type ProjectContext } from "../core/projects";
import { type ProjectState, readState, updateState } from "../core/state";
import { emit } from "../events/emit";
import { currentContextTokens, ingestSession } from "../usage/index";
import { jsonOut, type HookInput, type HookOutcome } from "./runner";

/** Runtime state plus the compaction mark kept by this module. */
type State = ProjectState & { lastCompactAt?: string };

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
    });
  } catch (err) {
    logError("hook ingest", err);
  }
}

function tokensOf(input: HookInput): number | null {
  return input.transcript_path ? currentContextTokens(input.transcript_path) : null;
}

const time = (s: string | undefined) => (s ? Date.parse(s) : NaN);

export function stop(input: HookInput): HookOutcome {
  const c = context(input);
  if (!c) return {};
  ingest(input, c);
  const cfg = loadConfig();
  if (cfg.contextStrategy !== "compact" || input.stop_hook_active) return {};
  const tokens = tokensOf(input);
  if (tokens === null || tokens < cfg.handoffAt) return {};
  const alerted = c.st.lastContextAlertAt;
  if (alerted && !(time(alerted) < time(c.st.lastCompactAt))) return {};
  emit({
    type: "alert.context",
    project: c.p.id,
    session: c.session,
    sprint: c.st.activeSprint,
    data: { tokens, limit: cfg.contextLimit, handoff: false },
  });
  updateState(c.p.id, (s) => {
    s.lastContextAlertAt = new Date().toISOString();
  });
  const k = (n: number) => Math.round(n / 1000);
  return jsonOut({
    decision: "block",
    reason:
      `Contexto em ${k(tokens)} mil tokens (limite ${k(cfg.contextLimit)} mil). ` +
      "Escreva agora o handoff com `hx handoff` (objetivo, tarefa atual, arquivos tocados, " +
      "decisões, próximos passos) e continue a tarefa.",
    systemMessage:
      "Contexto perto do limite: handoff pedido; a compactação automática vai liberar espaço.",
  });
}

export function subagentStop(input: HookInput): HookOutcome {
  const c = context(input);
  if (c) ingest(input, c);
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
    emit({ ...base, type: "handoff", data: { mode: "compact", file: path.basename(lh.file) } });
  } else {
    const data = { tokens: tokensOf(input) ?? 0, limit: cfg.contextLimit, handoff: false };
    emit({ ...base, type: "alert.context", data });
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
