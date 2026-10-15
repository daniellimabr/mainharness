import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildEvent, emit, readEvents } from "../src/events/emit";
import { DATA_SCHEMAS, validateEvent } from "../src/events/schema";
import { ULID_RE, ulid } from "../src/events/ulid";
import { isolateHome } from "./helpers";

let env: ReturnType<typeof isolateHome>;
beforeEach(() => (env = isolateHome()));
afterEach(() => env.cleanup());

describe("ulid", () => {
  it("is 26 Crockford chars and sortable by time", () => {
    const a = ulid(1000);
    const b = ulid(2000);
    expect(a).toMatch(ULID_RE);
    expect(a < b).toBe(true);
  });
});

describe("event schema", () => {
  const ok = () =>
    buildEvent({
      type: "task.done",
      project: "dashboard-ia",
      session: "abc-123",
      sprint: "S01",
      task: "T03",
      agent: "tech-lead",
      data: { duration_s: 1260 },
    });

  it("accepts a valid event", () => {
    expect(validateEvent(ok())).toEqual([]);
  });

  it("rejects unknown top-level fields", () => {
    expect(validateEvent({ ...ok(), prompt: "x" })).toContain("prompt: unknown field");
  });

  it("rejects unknown data fields (no content outside the schema)", () => {
    const e = ok();
    e.data = { duration_s: 1, code: "const a = 1" };
    expect(validateEvent(e)).toContain("data.code: unknown field");
  });

  it("rejects content-like strings in allowed fields", () => {
    const e = buildEvent({ type: "session.end", project: "p", data: { reason: "line1\nline2" } });
    expect(validateEvent(e).join()).toMatch(/looks like content/);
    const code = buildEvent({
      type: "session.end",
      project: "p",
      data: { reason: "if (a) { b(); }" },
    });
    expect(validateEvent(code).join()).toMatch(/looks like content/);
  });

  it("rejects bad project slug, unknown type and missing data fields", () => {
    expect(validateEvent({ ...ok(), project: "Dashboard IA" })).toContain("project: not a slug");
    expect(validateEvent({ ...ok(), type: "chat.message" }).join()).toMatch(/type: unknown/);
    const e = ok();
    e.data = {};
    expect(validateEvent(e)).toContain("data.duration_s: missing");
  });

  it("has a schema for every initial type of the contract", () => {
    for (const t of [
      "session.start",
      "session.end",
      "sprint.approved",
      "task.start",
      "task.done",
      "sprint.open",
      "sprint.close",
      "sprint.metrics",
      "usage",
      "alert.context",
      "handoff",
      "harness.request",
      "harness.release",
      "harness.rollback",
      "harness.migrate",
    ])
      expect(DATA_SCHEMAS).toHaveProperty(t);
  });
});

describe("emit", () => {
  it("appends one line per event to the UTC day file", () => {
    emit({
      type: "session.start",
      project: "main-harness",
      session: "s1",
      data: { source: "startup" },
    });
    emit({
      type: "session.end",
      project: "main-harness",
      session: "s1",
      data: { reason: "other" },
    });
    const files = fs.readdirSync(path.join(env.home, "events"));
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}\.jsonl$/);
    expect(readEvents().map((e) => e.type)).toEqual(["session.start", "session.end"]);
  });

  it("never writes an invalid event", () => {
    expect(() => emit({ type: "task.done", project: "p", data: { duration_s: "x" } })).toThrow();
    expect(readEvents()).toEqual([]);
  });

  it("every event written by any test of the suite stays valid", () => {
    // Guard used by other suites too: validate everything on disk.
    emit({
      type: "usage",
      project: "p",
      data: {
        model: "claude-opus-5-5",
        input: 1,
        output: 2,
        cache_write: 0,
        cache_read: 0,
        usd: 0.1,
        message_id: "msg_1",
        transcript: "main",
      },
    });
    for (const e of readEvents()) expect(validateEvent(e)).toEqual([]);
  });
});
