import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../src/core/config";
import { emit, readEvents } from "../src/events/emit";
import { validateEvent } from "../src/events/schema";
import { currentContextTokens, ingestSession, transcriptDirFor, usd } from "../src/usage";
import { fakeProject, isolateHome, readEventsIn, rm, runHx, tempDir } from "./helpers";

const FIX = path.join(__dirname, "fixtures", "transcripts");
const prices = DEFAULT_CONFIG.prices;

let env: ReturnType<typeof isolateHome>;
let dir: string;
let main: string;
beforeEach(() => {
  env = isolateHome();
  dir = tempDir("hx transcripts");
  fs.cpSync(FIX, dir, { recursive: true });
  main = path.join(dir, "sess-0001.jsonl");
});
afterEach(() => {
  env.cleanup();
  rm(dir);
});

const ingest = () =>
  ingestSession({
    transcriptPath: main,
    sessionId: "sess-0001",
    project: "proj-teste",
    sprint: "S00",
  });
const usageEvents = () => readEvents((e) => e.type === "usage");

describe("usd", () => {
  it("prices 5m and 1h cache writes separately", () => {
    const u = {
      input_tokens: 10,
      output_tokens: 100,
      cache_read_input_tokens: 1000,
      cache_creation_input_tokens: 2000,
      cache_creation: { ephemeral_5m_input_tokens: 1500, ephemeral_1h_input_tokens: 500 },
    };
    expect(usd("claude-opus-5-5", u, prices)).toBe(0.01374);
  });
  it("treats cache writes as 5m when there is no split", () => {
    const u = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 2000 };
    expect(usd("claude-opus-5-5", u, prices)).toBe(0.01);
  });
  it("matches dated model ids and returns null for unknown models", () => {
    expect(usd("claude-haiku-4-5-20251001", { input_tokens: 1_000_000 }, prices)).toBe(1);
    expect(usd("claude-unknown-9", { input_tokens: 5 }, prices)).toBeNull();
  });
});

describe("ingestSession", () => {
  it("dedupes by message id, skips synthetic, reads subagents", () => {
    expect(ingest().events).toBe(5);
    const evs = usageEvents();
    const byId = (id: string) => evs.find((e) => e.data.message_id === id) as (typeof evs)[number];
    expect(evs.map((e) => e.data.message_id).sort()).toEqual(
      ["msg_a1", "msg_a2", "msg_a3", "msg_s1", "msg_side"].sort(),
    );
    for (const e of evs) expect(validateEvent(e)).toEqual([]);
    const a1 = byId("msg_a1");
    expect(a1.agent).toBe("tech-lead");
    expect(a1.session).toBe("sess-0001");
    expect(a1.sprint).toBe("S00");
    expect(a1.data).toMatchObject({
      model: "claude-opus-5-5",
      input: 10,
      output: 100,
      cache_write: 2000,
      cache_read: 1000,
      usd: 0.01374,
      transcript: "main",
    });
    const s1 = byId("msg_s1");
    expect(s1.agent).toBe("reviewer");
    expect(s1.data.transcript).toBe("subagent");
    expect(byId("msg_a2").data.usd).toBeNull();
  });

  it("is incremental: a second run adds nothing, a new line adds one event", () => {
    ingest();
    expect(ingest().events).toBe(0);
    const line = (id: string) =>
      JSON.stringify({
        type: "assistant",
        isSidechain: false,
        timestamp: "2026-10-15T11:00:00.000Z",
        message: { id, model: "claude-opus-5-5", usage: { input_tokens: 1, output_tokens: 1 } },
      });
    // repeat of an already seen id + a new one + a partial line without newline
    fs.appendFileSync(main, line("msg_a3") + "\n" + line("msg_new") + "\n" + line("msg_part"));
    expect(ingest().events).toBe(1);
    fs.appendFileSync(main, "\n");
    expect(ingest().events).toBe(1);
    expect(usageEvents()).toHaveLength(7);
  });

  describe("streamed message (same id, growing output)", () => {
    const part = (output: number, stop: string | null) =>
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-10-15T12:00:00.000Z",
        message: {
          id: "msg_stream",
          model: "claude-opus-5-5",
          stop_reason: stop,
          usage: { input_tokens: 1, output_tokens: output },
        },
      }) + "\n";
    const outputs = () =>
      usageEvents()
        .filter((e) => e.data.message_id === "msg_stream")
        .map((e) => e.data.output);

    it("records the final output when all parts arrive in one read", () => {
      ingest();
      fs.appendFileSync(main, part(8, null) + part(120, null) + part(208, "tool_use"));
      expect(ingest().events).toBe(1);
      expect(outputs()).toEqual([208]);
    });

    it("waits for the last part when the message spans two reads", () => {
      ingest();
      fs.appendFileSync(main, part(8, null) + part(120, null));
      expect(ingest().events).toBe(0);
      fs.appendFileSync(main, part(208, "tool_use"));
      expect(ingest().events).toBe(1);
      expect(ingest().events).toBe(0);
      expect(outputs()).toEqual([208]);
    });

    it("waits for the last part when a user line sits between parts", () => {
      ingest();
      fs.appendFileSync(main, part(8, null) + part(120, null) + '{"type":"user"}\n');
      expect(ingest().events).toBe(0);
      fs.appendFileSync(main, part(208, "tool_use"));
      expect(ingest().events).toBe(1);
      expect(ingest().events).toBe(0);
      expect(outputs()).toEqual([208]);
    });
  });

  it("second ingest of a 5 MB transcript reads only the new bytes", () => {
    const big = path.join(dir, "big.jsonl");
    const row = JSON.stringify({
      type: "user",
      message: { role: "user", content: "x".repeat(500) },
    });
    fs.writeFileSync(big, `${row}\n`.repeat(Math.ceil(5_000_000 / (row.length + 1))));
    const opts = { transcriptPath: big, sessionId: "big", project: "proj-teste", sprint: null };
    ingestSession(opts);
    // counts bytes, not time: stays stable on a busy machine (B062)
    fs.appendFileSync(big, '{"type":"user","message":{"role":"user","content":"y"}}\n');
    const alloc = vi.spyOn(Buffer, "alloc");
    try {
      expect(ingestSession(opts).events).toBe(0);
      expect(alloc).toHaveBeenCalled();
      expect(Math.max(...alloc.mock.calls.map((c) => c[0]))).toBeLessThan(1024);
    } finally {
      alloc.mockRestore();
    }
  }, 120_000);
});

describe("currentContextTokens", () => {
  it("uses the last main-session response, ignoring sidechain", () => {
    expect(currentContextTokens(main)).toBe(5 + 3000 + 200);
  });
  it("returns null for a missing file", () => {
    expect(currentContextTokens(path.join(dir, "nope.jsonl"))).toBeNull();
  });
});

describe("transcriptDirFor", () => {
  it("maps a path with spaces to the Claude projects folder (case-insensitive)", () => {
    const cfg = tempDir("hx claude");
    const prev = process.env.CLAUDE_CONFIG_DIR;
    process.env.CLAUDE_CONFIG_DIR = cfg;
    try {
      fs.mkdirSync(path.join(cfg, "projects", "C--Main-Harness"), { recursive: true });
      expect(transcriptDirFor("c:\\Main Harness")).toBe(
        path.join(cfg, "projects", "C--Main-Harness"),
      );
      expect(transcriptDirFor("c:\\Other")).toBeNull();
    } finally {
      if (prev === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = prev;
      rm(cfg);
    }
  });
});

describe("hx usage", () => {
  it("ingests the project transcripts and prints a summary", () => {
    const proj = fakeProject();
    const cfg = tempDir("hx claude");
    try {
      const name = path.resolve(proj).replace(/[^A-Za-z0-9-]/g, "-");
      fs.cpSync(FIX, path.join(cfg, "projects", name), { recursive: true });
      const r = runHx(["usage"], {
        cwd: proj,
        env: { HARNESS_HOME: env.home, CLAUDE_CONFIG_DIR: cfg },
      });
      expect(r.stderr).toBe("");
      expect(r.code).toBe(0);
      expect(r.stdout).toMatch(/US\$/);
      expect(r.stdout).toMatch(/reviewer/);
      const evs = readEventsIn(env.home).filter((e) => e.type === "usage");
      expect(evs).toHaveLength(5);
      for (const e of evs) expect(validateEvent(e)).toEqual([]);
      const again = runHx(["usage"], {
        cwd: proj,
        env: { HARNESS_HOME: env.home, CLAUDE_CONFIG_DIR: cfg },
      });
      expect(again.code).toBe(0);
      expect(readEventsIn(env.home).filter((e) => e.type === "usage")).toHaveLength(5);
    } finally {
      rm(proj);
      rm(cfg);
    }
  });

  it("prints the last usage.limits as one line (B064)", () => {
    const proj = fakeProject();
    const cfg = tempDir("hx claude");
    try {
      const name = path.resolve(proj).replace(/[^A-Za-z0-9-]/g, "-");
      fs.cpSync(FIX, path.join(cfg, "projects", name), { recursive: true });
      emit({
        type: "usage.limits",
        project: "proj-teste",
        session: null,
        sprint: null,
        data: {
          five_hour: 42,
          five_hour_resets_at: null,
          seven_day: 18,
          seven_day_resets_at: null,
        },
      });
      const r = runHx(["usage"], {
        cwd: proj,
        env: { HARNESS_HOME: env.home, CLAUDE_CONFIG_DIR: cfg },
      });
      expect(r.code).toBe(0);
      expect(r.stdout.split("\n")).toContain("Limite: 5 h 42% · semana 18%");
    } finally {
      rm(proj);
      rm(cfg);
    }
  });
});
