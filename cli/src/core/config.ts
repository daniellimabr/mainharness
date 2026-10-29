// ~/.harness/config.json: prices, context limits and harness locations.
import * as fs from "node:fs";
import { readJson, writeJson } from "./fsx";
import { home } from "./paths";

/** US$ per million tokens. */
export interface Price {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

export interface Config {
  prices: Record<string, Price>;
  contextLimit: number;
  handoffAt: number;
  contextStrategy: "compact" | "new-chat";
  harnessRepo: string;
  stableDir: string;
  inboxDir: string;
  /** IANA timezone for times shown to people (events stay UTC). */
  timezone: string;
}

export const DEFAULT_CONFIG: Config = {
  prices: {
    "claude-opus-5-5": { input: 4, output: 20, cacheWrite5m: 5, cacheWrite1h: 8, cacheRead: 0.2 },
    "claude-sonnet-5-5": {
      input: 2,
      output: 10,
      cacheWrite5m: 2.5,
      cacheWrite1h: 4,
      cacheRead: 0.2,
    },
    "claude-fable-5-1": {
      input: 10,
      output: 50,
      cacheWrite5m: 12.5,
      cacheWrite1h: 20,
      cacheRead: 0.25,
    },
    "claude-haiku-4-5": {
      input: 1,
      output: 5,
      cacheWrite5m: 1.25,
      cacheWrite1h: 2,
      cacheRead: 0.1,
    },
  },
  contextLimit: 140000,
  handoffAt: 120000,
  contextStrategy: "compact",
  harnessRepo: "C:\\Main Harness",
  stableDir: "C:\\harness-stable",
  inboxDir: "C:\\Main Harness\\inbox",
  timezone: "America/Sao_Paulo",
};

/** Reads config.json merged over defaults; env vars override limits (used by tests). */
export function loadConfig(): Config {
  const file = readJson<Partial<Config>>(home.config(), {});
  // Treat old defaults (250000/230000) written by ensureConfig as absent to apply new defaults
  if (file.contextLimit === 250000) delete file.contextLimit;
  if (file.handoffAt === 230000) delete file.handoffAt;
  const cfg: Config = {
    ...DEFAULT_CONFIG,
    ...file,
    prices: { ...DEFAULT_CONFIG.prices, ...(file.prices ?? {}) },
  };
  const envNum = (k: string) => (process.env[k] ? Number(process.env[k]) : undefined);
  cfg.contextLimit = envNum("HARNESS_CONTEXT_LIMIT") ?? cfg.contextLimit;
  cfg.handoffAt = envNum("HARNESS_HANDOFF_AT") ?? Math.min(cfg.handoffAt, cfg.contextLimit);
  if (process.env.HARNESS_INBOX) cfg.inboxDir = process.env.HARNESS_INBOX;
  if (process.env.HARNESS_STABLE_DIR) cfg.stableDir = process.env.HARNESS_STABLE_DIR;
  if (process.env.HARNESS_REPO) cfg.harnessRepo = process.env.HARNESS_REPO;
  return cfg;
}

/** Writes the default config.json when missing. Returns true when created. */
export function ensureConfig(): boolean {
  if (fs.existsSync(home.config())) return false;
  writeJson(home.config(), DEFAULT_CONFIG);
  return true;
}
