// Event schema v1 (contract with the Dashboard, see docs/contracts/events.md).
// Events carry metadata only: ids, times, file names, counts, durations, values.
import { ULID_RE } from "./ulid";

export const EVENT_VERSION = 1;

type FieldType = "string" | "number" | "boolean" | "string[]" | "numberRecord";
interface Field {
  type: FieldType;
  optional?: boolean;
  nullable?: boolean;
  enum?: readonly string[];
}
const s = (extra: Partial<Field> = {}): Field => ({ type: "string", ...extra });
const n = (extra: Partial<Field> = {}): Field => ({ type: "number", ...extra });
const b = (extra: Partial<Field> = {}): Field => ({ type: "boolean", ...extra });
const opt = { optional: true };

export const DATA_SCHEMAS = {
  "session.start": { source: s(), model: s({ optional: true, nullable: true }) },
  "session.end": { reason: s() },
  "sprint.approved": { plan: s(), sha256: s(), approved_at: s(), approver: s() },
  "sprint.open": { tasks: n() },
  "sprint.close": { tasks_done: n(), tasks_total: n(), duration_s: n() },
  "sprint.feedback": { adjustments: n() },
  "sprint.metrics": {
    tasks_total: n(),
    tasks_done: n(),
    planned_min: n(),
    actual_min: n(),
    tokens_input: n(),
    tokens_output: n(),
    tokens_cache_write: n(),
    tokens_cache_read: n(),
    usd: n(),
    rework: n(),
    review_rejections: n(),
    context_alerts: n(),
    handoffs: n(),
    usd_by_agent: { type: "numberRecord" },
    usd_by_task: { type: "numberRecord" },
    actual_min_by_task: { type: "numberRecord" },
  },
  "task.start": { planned_min: n(opt) },
  "task.done": { duration_s: n(), planned_min: n(opt) },
  "review.result": { result: s({ enum: ["pass", "fail"] }) },
  usage: {
    model: s(),
    input: n(),
    output: n(),
    cache_write: n(),
    cache_read: n(),
    usd: n({ nullable: true }),
    message_id: s(),
    transcript: s({ enum: ["main", "subagent"] }),
  },
  "alert.context": { tokens: n(), limit: n(), handoff: b() },
  handoff: { mode: s({ enum: ["compact", "manual", "new-chat"] }), file: s({ nullable: true }) },
  "harness.request": { file: s(), priority: s({ enum: ["alta", "media", "baixa"] }) },
  "harness.release": { version: s(), tag: s(), previous: s({ nullable: true }) },
  "harness.rollback": { from: s(), to: s() },
  "harness.migrate": {
    from: s(),
    to: s(),
    kind: s({ enum: ["simple", "structural"] }),
    applied: b(),
  },
} as const satisfies Record<string, Record<string, Field>>;

export type EventType = keyof typeof DATA_SCHEMAS;
export const EVENT_TYPES = Object.keys(DATA_SCHEMAS) as EventType[];

export interface HarnessEvent {
  v: number;
  id: string;
  ts: string;
  harness: string;
  project: string;
  session: string | null;
  sprint: string | null;
  task: string | null;
  agent: string | null;
  type: EventType;
  data: Record<string, unknown>;
}

const TOP_KEYS = [
  "v",
  "id",
  "ts",
  "harness",
  "project",
  "session",
  "sprint",
  "task",
  "agent",
  "type",
  "data",
];
const MAX_STRING = 200;
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const ID_RE = /^[A-Za-z0-9._:@-]{1,128}$/;

/** A string that looks like content (code, prose, multi-line text) is rejected. */
function contentLike(v: string): boolean {
  return v.length > MAX_STRING || /[\r\n\t]/.test(v) || /[{};<>`]/.test(v);
}

function checkField(key: string, f: Field, v: unknown, errs: string[]): void {
  if (v === undefined) {
    if (!f.optional) errs.push(`data.${key}: missing`);
    return;
  }
  if (v === null) {
    if (!f.nullable) errs.push(`data.${key}: null not allowed`);
    return;
  }
  switch (f.type) {
    case "string":
      if (typeof v !== "string") errs.push(`data.${key}: expected string`);
      else if (contentLike(v)) errs.push(`data.${key}: looks like content`);
      else if (f.enum && !f.enum.includes(v)) errs.push(`data.${key}: not in ${f.enum.join("|")}`);
      break;
    case "number":
      if (typeof v !== "number" || !Number.isFinite(v)) errs.push(`data.${key}: expected number`);
      break;
    case "boolean":
      if (typeof v !== "boolean") errs.push(`data.${key}: expected boolean`);
      break;
    case "string[]":
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || contentLike(x)))
        errs.push(`data.${key}: expected string[]`);
      break;
    case "numberRecord":
      if (typeof v !== "object" || Array.isArray(v)) errs.push(`data.${key}: expected object`);
      else
        for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
          if (!ID_RE.test(k) || typeof x !== "number" || !Number.isFinite(x))
            errs.push(`data.${key}.${k}: expected number`);
        }
      break;
  }
}

/** Returns the list of schema violations (empty = valid). */
export function validateEvent(e: unknown): string[] {
  const errs: string[] = [];
  if (typeof e !== "object" || e === null || Array.isArray(e)) return ["event: not an object"];
  const ev = e as Record<string, unknown>;
  for (const k of Object.keys(ev)) if (!TOP_KEYS.includes(k)) errs.push(`${k}: unknown field`);
  for (const k of TOP_KEYS) if (!(k in ev)) errs.push(`${k}: missing`);
  if (ev.v !== EVENT_VERSION) errs.push("v: unsupported version");
  if (typeof ev.id !== "string" || !ULID_RE.test(ev.id)) errs.push("id: not a ULID");
  if (typeof ev.ts !== "string" || !TS_RE.test(ev.ts)) errs.push("ts: not UTC ISO-8601");
  if (typeof ev.harness !== "string" || !/^\d+\.\d+\.\d+$/.test(ev.harness))
    errs.push("harness: not semver");
  if (typeof ev.project !== "string" || !/^[a-z0-9-]+$/.test(ev.project))
    errs.push("project: not a slug");
  for (const k of ["session", "sprint", "task", "agent"]) {
    const v = ev[k];
    if (v !== null && (typeof v !== "string" || !ID_RE.test(v))) errs.push(`${k}: invalid id`);
  }
  const schema = DATA_SCHEMAS[ev.type as EventType] as Record<string, Field> | undefined;
  if (!schema) {
    errs.push(`type: unknown (${String(ev.type)})`);
    return errs;
  }
  if (typeof ev.data !== "object" || ev.data === null || Array.isArray(ev.data)) {
    errs.push("data: not an object");
    return errs;
  }
  const data = ev.data as Record<string, unknown>;
  for (const k of Object.keys(data)) if (!(k in schema)) errs.push(`data.${k}: unknown field`);
  for (const [k, f] of Object.entries(schema)) checkField(k, f, data[k], errs);
  return errs;
}
