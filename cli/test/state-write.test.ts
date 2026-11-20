import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emit } from "../src/events/emit";
import { writeDashboardState } from "../src/state/write";
import { ingestSession } from "../src/usage";
import { rm, tempDir } from "./helpers";

let base: string;
let file: string;
const OLD = { ...process.env };

beforeEach(() => {
  base = tempDir("state write");
  process.env.HARNESS_HOME = path.join(base, "home");
  delete process.env.HARNESS_DASHBOARD;
  file = path.join(base, "home", "dashboard", "p1.json");
});
afterEach(() => {
  process.env = { ...OLD };
  rm(base);
});

const read = () => JSON.parse(fs.readFileSync(file, "utf8")) as { project: { id: string } };
const tmps = () => fs.readdirSync(path.dirname(file)).filter((f) => f.endsWith(".tmp"));

describe("writeDashboardState", () => {
  it("creates the folder and writes a complete file, no temp left", () => {
    emit({ type: "session.start", project: "p1", data: { source: "startup" } });
    expect(read().project.id).toBe("p1");
    expect(tmps()).toEqual([]);
  });

  it("two writes in a row stay consistent", () => {
    emit({ type: "session.start", project: "p1", data: { source: "startup" } });
    writeDashboardState("p1");
    expect(read().project.id).toBe("p1");
  });

  it("HARNESS_DASHBOARD=off writes nothing", () => {
    process.env.HARNESS_DASHBOARD = "off";
    emit({ type: "session.start", project: "p1", data: { source: "startup" } });
    expect(fs.existsSync(file)).toBe(false);
  });

  it("does not write for usage or context events", () => {
    emit({ type: "context", project: "p1", data: { tokens: 1, limit: 2, last_compact_at: null } });
    expect(fs.existsSync(file)).toBe(false);
  });

  it("unwritable state folder: emit does not break and the event is kept", () => {
    fs.mkdirSync(path.join(base, "home"), { recursive: true });
    fs.writeFileSync(path.join(base, "home", "dashboard"), "a file, not a folder");
    const ev = emit({ type: "session.start", project: "p1", data: { source: "startup" } });
    const day = path.join(base, "home", "events", `${ev.ts.slice(0, 10)}.jsonl`);
    expect(fs.readFileSync(day, "utf8")).toContain(ev.id);
  });

  it("project without a usable id writes nothing", () => {
    expect(() => writeDashboardState("")).not.toThrow();
    expect(() => writeDashboardState("../x")).not.toThrow();
    expect(fs.existsSync(path.join(base, "home", "dashboard"))).toBe(false);
  });

  it("usage batch writes once, at the end", () => {
    const t = path.join(base, "t.jsonl");
    const line = (id: string) =>
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-11-20T10:00:00.000Z",
        message: {
          id,
          model: "claude-sonnet-4-5",
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        },
      });
    fs.writeFileSync(t, [line("m1"), line("m2"), line("m3")].join("\n") + "\n");
    const r = ingestSession({ project: "p1", sessionId: "s1", sprint: null, transcriptPath: t });
    expect(r.events).toBe(3);
    expect(fs.existsSync(file)).toBe(true);
    expect(tmps()).toEqual([]);
  });
});
