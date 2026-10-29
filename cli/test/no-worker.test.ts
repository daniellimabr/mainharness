// S13/T01 (ADR 0014): the Gemini worker is gone; its old events and config stay readable.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { loadConfig } from "../src/core/config";
import { fakeProject, isolateHome, rm, runHx, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
beforeEach(() => {
  env = isolateHome();
});
afterEach(() => env.cleanup());

it("hx worker is an unknown command", () => {
  const r = runHx(["worker", "status"], { env: { HARNESS_HOME: env.home } });
  expect(r.code).toBe(1);
  expect(r.stderr).toContain("comando desconhecido: worker");
});

it("loadConfig ignores an old worker key without breaking", () => {
  fs.writeFileSync(
    path.join(env.home, "config.json"),
    JSON.stringify({ worker: { token: "x", url: "http://localhost:1", model: "gemini/x" } }),
  );
  expect(loadConfig().timezone).toBe("America/Sao_Paulo");
});

it("hx usage reads a log with old worker events", () => {
  const proj = fakeProject();
  const cfg = tempDir("hx claude");
  try {
    const base = {
      v: 1,
      harness: "0.10.0",
      project: "proj-teste",
      session: "s1",
      sprint: "S12",
      task: "T01",
      agent: "gemini",
    };
    const lines = [
      {
        ...base,
        id: "01JAAAAAAAAAAAAAAAAAAAAAA1",
        ts: "2026-10-20T10:00:00.000Z",
        type: "worker.start",
        data: { model: "gemini/g" },
      },
      {
        ...base,
        id: "01JAAAAAAAAAAAAAAAAAAAAAA2",
        ts: "2026-10-20T10:01:00.000Z",
        type: "usage",
        data: {
          model: "gemini/g",
          input: 10,
          output: 5,
          cache_write: 0,
          cache_read: 0,
          usd: null,
          message_id: "m1",
          transcript: "main",
        },
      },
      {
        ...base,
        id: "01JAAAAAAAAAAAAAAAAAAAAAA3",
        ts: "2026-10-20T10:02:00.000Z",
        type: "worker.end",
        data: { model: "gemini/g", exit_code: 0, duration_s: 120 },
      },
    ];
    fs.mkdirSync(path.join(env.home, "events"), { recursive: true });
    fs.writeFileSync(
      path.join(env.home, "events", "2026-10-20.jsonl"),
      lines.map((l) => JSON.stringify(l)).join("\n") + "\n",
    );
    // Empty transcript dir: hx usage only sums the logged events.
    const name = path.resolve(proj).replace(/[^A-Za-z0-9-]/g, "-");
    fs.mkdirSync(path.join(cfg, "projects", name), { recursive: true });
    const r = runHx(["usage"], {
      cwd: proj,
      env: { HARNESS_HOME: env.home, CLAUDE_CONFIG_DIR: cfg },
    });
    expect(r.stderr).toBe("");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("fora do Claude (gemini/g");
  } finally {
    rm(proj);
    rm(cfg);
  }
});
