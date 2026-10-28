import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config";
import { isolateHome } from "./helpers";

describe("config", () => {
  let env: ReturnType<typeof isolateHome>;
  let prevEnv: Record<string, string | undefined>;

  beforeEach(() => {
    env = isolateHome();
    prevEnv = {
      HARNESS_CONTEXT_LIMIT: process.env.HARNESS_CONTEXT_LIMIT,
      HARNESS_HANDOFF_AT: process.env.HARNESS_HANDOFF_AT,
    };
    delete process.env.HARNESS_CONTEXT_LIMIT;
    delete process.env.HARNESS_HANDOFF_AT;
  });

  afterEach(() => {
    if (prevEnv.HARNESS_CONTEXT_LIMIT !== undefined) {
      process.env.HARNESS_CONTEXT_LIMIT = prevEnv.HARNESS_CONTEXT_LIMIT;
    } else {
      delete process.env.HARNESS_CONTEXT_LIMIT;
    }
    if (prevEnv.HARNESS_HANDOFF_AT !== undefined) {
      process.env.HARNESS_HANDOFF_AT = prevEnv.HARNESS_HANDOFF_AT;
    } else {
      delete process.env.HARNESS_HANDOFF_AT;
    }
    env.cleanup();
  });

  it("loads new defaults when config.json is missing", () => {
    const cfg = loadConfig();
    expect(cfg.contextLimit).toBe(140000);
    expect(cfg.handoffAt).toBe(120000);
  });

  it("respects custom config values (e.g. handoffAt 100000)", () => {
    fs.writeFileSync(
      path.join(env.home, "config.json"),
      JSON.stringify({ handoffAt: 100000, contextLimit: 120000 }),
    );
    const cfg = loadConfig();
    expect(cfg.contextLimit).toBe(120000);
    expect(cfg.handoffAt).toBe(100000);
  });

  it("treats old defaults (250000/230000) as absent and applies new defaults", () => {
    fs.writeFileSync(
      path.join(env.home, "config.json"),
      JSON.stringify({ contextLimit: 250000, handoffAt: 230000 }),
    );
    const cfg = loadConfig();
    expect(cfg.contextLimit).toBe(140000);
    expect(cfg.handoffAt).toBe(120000);
  });

  it("respects env vars HARNESS_CONTEXT_LIMIT and HARNESS_HANDOFF_AT", () => {
    process.env.HARNESS_CONTEXT_LIMIT = "160000";
    process.env.HARNESS_HANDOFF_AT = "130000";
    const cfg = loadConfig();
    expect(cfg.contextLimit).toBe(160000);
    expect(cfg.handoffAt).toBe(130000);
  });
});
