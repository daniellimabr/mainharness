// hx worker status: OmniRoute (Gemini) worker config check; never touches ~/.claude/settings.json (ADR 0012).
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/worker";
import { isolateHome, rm, tempDir } from "./helpers";

const TOKEN = "sk-omni-secret";
const SETTINGS = `{ "model": "opus", "env": { "FOO": "1" } }\n`;

let env: ReturnType<typeof isolateHome>;
let claude: string;
let out: string[];

const up = vi.fn(async () => new Response("{}", { status: 200 }));
const down = vi.fn(async () => {
  throw new Error("ECONNREFUSED");
});

function writeConfig(worker: Record<string, unknown>): void {
  fs.writeFileSync(path.join(env.home, "config.json"), JSON.stringify({ worker }));
}

beforeEach(() => {
  env = isolateHome();
  claude = tempDir("hx claude");
  process.env.CLAUDE_CONFIG_DIR = claude;
  fs.writeFileSync(path.join(claude, "settings.json"), SETTINGS);
  out = [];
  vi.spyOn(console, "log").mockImplementation((m: string) => void out.push(m));
  vi.spyOn(console, "error").mockImplementation((m: string) => void out.push(m));
});
afterEach(() => {
  // Chats must never be redirected: settings.json stays byte for byte.
  expect(fs.readFileSync(path.join(claude, "settings.json"), "utf8")).toBe(SETTINGS);
  vi.restoreAllMocks();
  up.mockClear();
  delete process.env.CLAUDE_CONFIG_DIR;
  env.cleanup();
  rm(claude);
});

describe("hx worker status", () => {
  it("says not configured without a token and does not call OmniRoute", async () => {
    expect(await run(["status"], { fetch: up })).toBe(1);
    expect(out.join("\n")).toMatch(/não configurado/);
    expect(up).not.toHaveBeenCalled();
  });

  it("says OmniRoute is down", async () => {
    writeConfig({ token: TOKEN });
    expect(await run(["status"], { fetch: down })).toBe(1);
    expect(out.join("\n")).toMatch(/fora do ar/);
  });

  it("shows the model when OmniRoute is up, never the token", async () => {
    writeConfig({ token: TOKEN });
    expect(await run(["status"], { fetch: up })).toBe(0);
    const [url, init] = up.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:20128/v1/models");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    const text = out.join("\n");
    expect(text).toContain("gemini/gemini-3.5-flash-lite");
    expect(text).not.toContain(TOKEN);
  });

  it("rejects unknown subcommands, including the old on/off", async () => {
    for (const cmd of ["on", "off", undefined]) expect(await run(cmd ? [cmd] : [])).toBe(1);
  });
});
