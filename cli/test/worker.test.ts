// hx worker check|run (S14/T01, B100): external Anthropic-format models by alias from config.json.
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/worker";
import { fakeProject, isolateHome, readEventsIn, rm, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let server: http.Server | undefined;
let url = "";
let seen: { path?: string; key?: string; body?: string } = {};
const posts: number[] = []; // body size of each request received

function writeConfig(workerUrl: string): void {
  fs.writeFileSync(
    path.join(env.home, "config.json"),
    JSON.stringify({
      workers: {
        ds: {
          url: workerUrl,
          model: "cfp/deepseek-v4",
          token: "sk-secret",
          price: { input: 1, output: 2 },
        },
      },
    }),
  );
}

/** Local fake: "ok" answers like /v1/messages, "401" rejects the key, "hang" never answers. */
async function serve(
  mode: "ok" | "401" | "429" | "hang",
  bigStatus = 200, // status for the ~100 KB probe
): Promise<void> {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d: Buffer) => (body += String(d)));
    req.on("end", () => {
      seen = { path: req.url, key: String(req.headers["x-api-key"]), body };
      posts.push(body.length);
      if (mode === "hang") return;
      const status = mode === "ok" ? (body.length > 50_000 ? bigStatus : 200) : Number(mode);
      res.writeHead(status, { "content-type": "application/json" });
      res.end(
        status === 200
          ? JSON.stringify({ type: "message", content: [{ type: "text", text: "ok" }] })
          : JSON.stringify({ type: "error", error: { message: "nope" } }),
      );
    });
  });
  await new Promise<void>((r) => server?.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  writeConfig(url);
}

beforeEach(() => {
  env = isolateHome();
  seen = {};
  posts.length = 0;
});
afterEach(async () => {
  vi.restoreAllMocks();
  server?.closeAllConnections();
  await new Promise((r) => (server ? server.close(r) : r(null)));
  server = undefined;
  env.cleanup();
});

describe("hx worker check", () => {
  it("prints ready only after a real /v1/messages answer", async () => {
    await serve("ok");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await run(["check", "ds"])).toBe(0);
    expect(seen.path).toBe("/v1/messages");
    expect(seen.key).toBe("sk-secret");
    expect(JSON.parse(seen.body ?? "{}")).toMatchObject({ model: "cfp/deepseek-v4" });
    expect(log.mock.calls.join(" ")).toContain("pronto");
  });

  it("wrong key: clear error, exit 1", async () => {
    await serve("401");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await run(["check", "ds"])).toBe(1);
    expect(err.mock.calls.join(" ")).toContain("chave recusada");
    expect(err.mock.calls.join(" ")).not.toContain("sk-secret");
  });

  it("service not answering: clear error, exit 1", async () => {
    await serve("hang");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await run(["check", "ds"], { timeoutMs: 300 })).toBe(1);
    expect(err.mock.calls.join(" ")).toContain("não respondeu");
  });

  it("runs a small and a ~100 KB probe, both must pass", async () => {
    await serve("ok");
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await run(["check", "ds"])).toBe(0);
    expect(posts).toHaveLength(2);
    expect(posts[0]).toBeLessThan(1000);
    expect(posts[1]).toBeGreaterThan(90_000);
  });

  it.each([413, 502])("big probe HTTP %i: size error, exit 1", async (code) => {
    await serve("ok", code);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await run(["check", "ds"])).toBe(1);
    expect(err.mock.calls.join(" ")).toContain("tamanho");
    expect(err.mock.calls.join(" ")).not.toContain("sk-secret");
    expect(log.mock.calls.join(" ")).not.toContain("pronto");
  });

  it("429: quota error, big probe skipped", async () => {
    await serve("429");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await run(["check", "ds"])).toBe(1);
    expect(err.mock.calls.join(" ")).toContain("cota");
    expect(posts).toHaveLength(1);
  });

  it("wrong key: big probe skipped", async () => {
    await serve("401");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await run(["check", "ds"])).toBe(1);
    expect(posts).toHaveLength(1);
  });

  it("unknown alias: error, exit 1", async () => {
    writeConfig("http://127.0.0.1:1");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await run(["check", "nope"])).toBe(1);
    expect(err.mock.calls.join(" ")).toContain("nope");
  });
});

// Fake `claude -p`: records argv, stdin and the env it got; prints stream-json with usage.
const FAKE = `
const fs = require("fs");
let p = ""; process.stdin.on("data", d => p += d).on("end", () => {
  const e = process.env;
  fs.writeFileSync(e.FAKE_OUT, JSON.stringify({ argv: process.argv.slice(2), stdin: p,
    base: e.ANTHROPIC_BASE_URL, token: e.ANTHROPIC_AUTH_TOKEN, model: e.ANTHROPIC_MODEL,
    sonnet: e.ANTHROPIC_DEFAULT_SONNET_MODEL, claudecode: e.CLAUDECODE ?? null }));
  process.stdout.write(JSON.stringify({ type: "result", result: "feito sk-secret", session_id: "sess1",
    modelUsage: { "cfp/deepseek-v4": { inputTokens: 1000, outputTokens: 500, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, costUSD: 9 } } }) + "\\n");
});`;

describe("hx worker run", () => {
  let proj: string;
  let cfg: string;
  beforeEach(() => {
    proj = fakeProject();
    cfg = tempDir("hx claude cfg");
    fs.writeFileSync(path.join(cfg, "settings.json"), '{"model":"opus"}');
    const fake = path.join(env.home, "fake claude.js");
    fs.writeFileSync(fake, FAKE);
    vi.stubEnv("HX_CLAUDE_BIN", `"${process.execPath}" "${fake}"`);
    vi.stubEnv("FAKE_OUT", path.join(env.home, "out.json"));
    vi.stubEnv("CLAUDE_CONFIG_DIR", cfg);
    vi.stubEnv("CLAUDECODE", "1");
    writeConfig("http://127.0.0.1:9");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rm(proj);
    rm(cfg);
  });

  it("runs claude with the alias env only in the child and logs start, usage and end", async () => {
    const handoff = path.join(proj, "handoff.md");
    fs.writeFileSync(handoff, "Faça a T01.");
    const hash = () =>
      createHash("sha256")
        .update(fs.readFileSync(path.join(cfg, "settings.json")))
        .digest("hex");
    const before = hash();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    expect(await run(["run", "T01", handoff, "--model", "ds"], { cwd: proj })).toBe(0);

    const got = JSON.parse(fs.readFileSync(path.join(env.home, "out.json"), "utf8")) as Record<
      string,
      unknown
    >;
    expect(got).toMatchObject({
      stdin: "Faça a T01.",
      base: "http://127.0.0.1:9",
      token: "sk-secret",
      model: "cfp/deepseek-v4",
      sonnet: "cfp/deepseek-v4",
      claudecode: null,
    });
    expect(got.argv).toEqual(expect.arrayContaining(["--model", "cfp/deepseek-v4"]));
    expect(process.env.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(hash()).toBe(before);
    expect(log.mock.calls.join(" ")).not.toContain("sk-secret");

    const evs = readEventsIn(env.home);
    const start = evs.find((e) => e.type === "agent.start");
    const id = (start?.data as { agent_id: string }).agent_id;
    expect(start).toMatchObject({
      task: "T01",
      agent: "worker",
      data: { agent_type: "worker", model: "cfp/deepseek-v4" },
    });
    expect(evs.find((e) => e.type === "usage")).toMatchObject({
      task: "T01",
      agent: "worker",
      data: { agent_id: id, model: "cfp/deepseek-v4", input: 1000, output: 500, usd: 0.002 },
    });
    expect(evs.find((e) => e.type === "agent.end")).toMatchObject({
      task: "T01",
      data: { agent_id: id },
    });
  });

  it("bad args or missing handoff: exit 1, nothing spawned", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await run(["run", "T01", path.join(proj, "none.md"), "--model", "ds"], { cwd: proj }),
    ).toBe(1);
    expect(await run(["run", "x", "h.md"], { cwd: proj })).toBe(1);
    expect(fs.existsSync(path.join(env.home, "out.json"))).toBe(false);
  });
});
