// Appends validated events to ~/.harness/events/YYYY-MM-DD.jsonl (UTC day). Append-only.
import * as fs from "node:fs";
import * as path from "node:path";
import { home } from "../core/paths";
import { harnessVersion } from "../core/version";
import { EVENT_VERSION, type EventType, type HarnessEvent, validateEvent } from "./schema";
import { ulid } from "./ulid";

export interface EmitInput {
  type: EventType;
  project: string;
  session?: string | null;
  sprint?: string | null;
  task?: string | null;
  agent?: string | null;
  data: Record<string, unknown>;
  ts?: string;
}

export function utcStamp(d = new Date()): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function buildEvent(input: EmitInput): HarnessEvent {
  return {
    v: EVENT_VERSION,
    id: ulid(),
    ts: input.ts ?? utcStamp(),
    harness: harnessVersion(),
    project: input.project,
    session: input.session ?? null,
    sprint: input.sprint ?? null,
    task: input.task ?? null,
    agent: input.agent ?? null,
    type: input.type,
    data: input.data,
  };
}

/** Validates and appends one event. Throws on schema violation (never writes a bad line). */
export function emit(input: EmitInput): HarnessEvent {
  const ev = buildEvent(input);
  if (process.env.HARNESS_DASHBOARD === "off") return ev; // experiment switch: no I/O
  const errs = validateEvent(ev);
  if (errs.length) throw new Error(`invalid event ${ev.type}: ${errs.join("; ")}`);
  const dir = home.events();
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `${ev.ts.slice(0, 10)}.jsonl`), JSON.stringify(ev) + "\n");
  return ev;
}

/** Reads every event in the events folder (optionally filtered). For metrics and tests. */
export function readEvents(filter?: (e: HarnessEvent) => boolean): HarnessEvent[] {
  const dir = home.events();
  if (!fs.existsSync(dir)) return [];
  const out: HarnessEvent[] = [];
  for (const f of fs
    .readdirSync(dir)
    .filter((x) => x.endsWith(".jsonl"))
    .sort()) {
    for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as HarnessEvent;
        if (!filter || filter(e)) out.push(e);
      } catch {
        // skip a torn line
      }
    }
  }
  return out;
}
