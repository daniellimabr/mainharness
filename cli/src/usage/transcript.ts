// TranscriptSource: reads Claude Code JSONL transcripts incrementally and emits `usage` events.
import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig } from "../core/config";
import { readJson, writeJson } from "../core/fsx";
import { logError } from "../core/log";
import { home } from "../core/paths";
import { emit, readEvents } from "../events/emit";
import type { HarnessEvent } from "../events/schema";
import { type TranscriptUsage, usd } from "./price";

export interface IngestOptions {
  transcriptPath: string;
  sessionId: string;
  project: string;
  sprint: string | null;
  task?: string | null;
  /** Task of each subagent by agent id (from its `agent.start`); main transcript uses `task`. */
  agentTasks?: Record<string, string>;
}

/** A source of per-response usage (transcripts today, OpenTelemetry later). */
export interface UsageSource {
  ingest(opts: IngestOptions): HarnessEvent[];
}

interface AssistantLine {
  type?: string;
  isSidechain?: boolean;
  timestamp?: string;
  message?: { id?: string; model?: string; stop_reason?: string | null; usage?: TranscriptUsage };
}

interface Cache {
  offsets: Record<string, number>;
  seen: string[];
}

const SEEN_KEEP = 500;
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

const safeId = (s: string) => s.replace(/[^A-Za-z0-9._:@-]/g, "-").slice(0, 128);

/** Reads complete lines after `offset`. Returns them and the new offset (partial tail kept). */
function readNew(file: string, offset: number): { lines: string[]; offset: number } {
  let fd: number;
  try {
    fd = fs.openSync(file, "r");
  } catch {
    return { lines: [], offset };
  }
  try {
    const size = fs.fstatSync(fd).size;
    if (size < offset) offset = 0; // file was replaced
    if (size === offset) return { lines: [], offset };
    const buf = Buffer.alloc(size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    const end = buf.lastIndexOf(10);
    if (end < 0) return { lines: [], offset };
    return { lines: buf.toString("utf8", 0, end).split("\n"), offset: offset + end + 1 };
  } finally {
    fs.closeSync(fd);
  }
}

function parseAssistant(line: string): AssistantLine | null {
  if (!line.includes('"assistant"')) return null;
  try {
    const o = JSON.parse(line) as AssistantLine;
    if (o.type !== "assistant" || !o.message?.id || !o.message.usage) return null;
    if (!o.message.model || o.message.model === "<synthetic>") return null;
    return o;
  } catch {
    return null;
  }
}

/** Subagent name from the agent-<id>.meta.json next to its transcript, else "subagent". */
function subagentName(file: string): string {
  const meta = readJson<{ agentType?: unknown }>(file.replace(/\.jsonl$/, ".meta.json"), {});
  return (typeof meta.agentType === "string" && safeId(meta.agentType)) || "subagent";
}

function ingestTranscripts(opts: IngestOptions): HarnessEvent[] {
  const cacheFile = path.join(home.usageCache(), `${safeId(opts.sessionId)}.json`);
  const cache = readJson<Cache>(cacheFile, { offsets: {}, seen: [] });
  // Cache lost: the event log is the source of truth for what was already recorded.
  if (!fs.existsSync(cacheFile)) {
    for (const e of readEvents((e) => e.type === "usage" && e.session === opts.sessionId))
      if (typeof e.data.message_id === "string") cache.seen.push(e.data.message_id);
  }
  const seen = new Set(cache.seen);
  const order = [...cache.seen];
  const prices = loadConfig().prices;
  const unpriced = new Set<string>();
  const out: HarnessEvent[] = [];

  const subDir = path.join(path.dirname(opts.transcriptPath), opts.sessionId, "subagents");
  let subs: string[] = [];
  try {
    subs = fs.readdirSync(subDir).filter((f) => f.endsWith(".jsonl"));
  } catch {
    // no subagents
  }
  const files = [
    {
      key: "main",
      file: opts.transcriptPath,
      agent: null as string | null,
      task: opts.task ?? null,
    },
    ...subs.map((f) => ({
      key: `subagents/${f}`,
      file: path.join(subDir, f),
      agent: subagentName(path.join(subDir, f)),
      task: opts.agentTasks?.[f.replace(/^agent-|\.jsonl$/g, "")] ?? null,
    })),
  ];

  for (const { key, file, agent, task } of files) {
    const { lines, offset } = readNew(file, cache.offsets[key] ?? 0);
    const parsed = lines.map(parseAssistant);
    // A streamed message writes one line per part (same id, growing output_tokens); only the
    // last part has stop_reason set. A trailing message still streaming is re-read next time,
    // from its first part, even with other lines (e.g. `user`) between its parts.
    let keep = lines.length;
    let t = parsed.length - 1;
    while (t >= 0 && !parsed[t]) t--;
    const tail = parsed[t]?.message;
    if (tail?.stop_reason === null) keep = parsed.findIndex((o) => o?.message?.id === tail.id);
    cache.offsets[key] =
      offset - lines.slice(keep).reduce((n, l) => n + Buffer.byteLength(l) + 1, 0);
    const last = new Map<string, AssistantLine>();
    for (const o of parsed.slice(0, keep)) if (o) last.set(o.message?.id as string, o);
    for (const o of last.values()) {
      const m = o.message as Required<NonNullable<AssistantLine["message"]>>;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      order.push(m.id);
      const u = m.usage;
      const cost = usd(m.model, u, prices);
      if (cost === null && !unpriced.has(m.model)) {
        unpriced.add(m.model);
        logError("usage", `no price for model ${m.model}`);
      }
      const side = agent !== null || o.isSidechain === true;
      try {
        out.push(
          emit({
            type: "usage",
            project: opts.project,
            session: opts.sessionId,
            sprint: opts.sprint,
            task,
            agent: agent ?? (side ? "subagent" : "tech-lead"),
            ts: o.timestamp && TS_RE.test(o.timestamp) ? o.timestamp : undefined,
            data: {
              model: m.model,
              input: u.input_tokens ?? 0,
              output: u.output_tokens ?? 0,
              cache_write: u.cache_creation_input_tokens ?? 0,
              cache_read: u.cache_read_input_tokens ?? 0,
              usd: cost,
              message_id: m.id,
              transcript: side ? "subagent" : "main",
            },
          }),
        );
      } catch (err) {
        logError("usage", err);
      }
    }
  }

  writeJson(cacheFile, { offsets: cache.offsets, seen: order.slice(-SEEN_KEEP) });
  return out;
}

export const transcriptSource: UsageSource = { ingest: ingestTranscripts };

/** Reads the last `bytes` of a file as complete lines (first partial line dropped). */
function tailLines(file: string, bytes: number): { lines: string[]; whole: boolean } | null {
  let fd: number;
  try {
    fd = fs.openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    const lines = buf.toString("utf8").split("\n");
    if (start > 0) lines.shift();
    return { lines, whole: start === 0 };
  } finally {
    fs.closeSync(fd);
  }
}

/** Context size of the last main-session response: input + cache read + cache write. */
export function currentContextTokens(transcriptPath: string): number | null {
  for (const bytes of [256 * 1024, 4 * 1024 * 1024]) {
    const tail = tailLines(transcriptPath, bytes);
    if (!tail) return null;
    for (let i = tail.lines.length - 1; i >= 0; i--) {
      const o = parseAssistant(tail.lines[i] as string);
      if (!o || o.isSidechain) continue;
      const u = o.message?.usage as TranscriptUsage;
      return (
        (u.input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0)
      );
    }
    if (tail.whole) return null;
  }
  return null;
}
