// B064: plan usage % (5 h and weekly) from the OAuth usage endpoint, throttled in the Stop.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { exceededResetsAt, lastLimits, limitsLine, refreshLimits } from "../src/usage/limits";
import { isolateHome, readEventsIn, rm, tempDir } from "./helpers";

const TOKEN = "sk-ant-oat01-FAKE-test-token";
const BODY = {
  five_hour: { utilization: 42, resets_at: "2026-10-21T15:00:00.123456+00:00" },
  seven_day: { utilization: 18.4, resets_at: "2026-10-25T09:00:00+00:00" },
};

let env: ReturnType<typeof isolateHome>;
let claude: string;
let prevCfg: string | undefined;
let calls: { url: string; init: RequestInit }[];

beforeEach(() => {
  env = isolateHome();
  claude = tempDir("hx claude");
  prevCfg = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = claude;
  delete process.env.HARNESS_NO_LIMITS;
  calls = [];
  fs.writeFileSync(
    path.join(claude, ".credentials.json"),
    JSON.stringify({ claudeAiOauth: { accessToken: TOKEN, refreshToken: "r", expiresAt: 1 } }),
  );
});
afterEach(() => {
  if (prevCfg === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = prevCfg;
  env.cleanup();
  rm(claude);
});

const reply =
  (body: unknown, status = 200): typeof fetch =>
  (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  };
const ctx = { project: "proj-teste", session: "s1", sprint: "S07" };
const limitEvents = () => readEventsIn(env.home).filter((e) => e.type === "usage.limits");
const T0 = Date.parse("2026-10-21T12:00:00Z");

it("valid reply: emits usage.limits with both % and reset times, token only in the header", async () => {
  await refreshLimits(ctx, { fetch: reply(BODY), now: T0 });
  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe("https://api.anthropic.com/api/oauth/usage");
  const h = calls[0]?.init.headers as Record<string, string>;
  expect(h.Authorization).toBe(`Bearer ${TOKEN}`);
  expect(h["anthropic-beta"]).toBe("oauth-2025-04-20");
  expect(limitEvents()).toMatchObject([
    {
      project: "proj-teste",
      session: "s1",
      sprint: "S07",
      data: {
        five_hour: 42,
        five_hour_resets_at: "2026-10-21T15:00:00.123Z",
        seven_day: 18.4,
        seven_day_resets_at: "2026-10-25T09:00:00.000Z",
      },
    },
  ]);
  expect(lastLimits()?.five_hour).toBe(42);
  expect(limitsLine()).toBe("Limite: 5 h 42% · semana 18%");
});

it("calls at most once every 5 min", async () => {
  await refreshLimits(ctx, { fetch: reply(BODY), now: T0 });
  await refreshLimits(ctx, { fetch: reply(BODY), now: T0 + 4 * 60_000 });
  expect(calls).toHaveLength(1);
  await refreshLimits(ctx, { fetch: reply(BODY), now: T0 + 5 * 60_000 });
  expect(calls).toHaveLength(2);
  expect(limitEvents()).toHaveLength(2);
});

it.each([
  ["invalid body", reply({ five_hour: { utilization: "x" } })],
  ["HTTP error", reply({ error: "rate_limit" }, 429)],
  ["not JSON", (() => Promise.resolve(new Response("<html>"))) as typeof fetch],
  ["network error", (() => Promise.reject(new Error(`boom ${TOKEN}`))) as typeof fetch],
])("%s: nothing is written and nothing is thrown", async (_, f) => {
  await expect(refreshLimits(ctx, { fetch: f, now: T0 })).resolves.toBeUndefined();
  expect(limitEvents()).toEqual([]);
});

it("slow reply: aborted at the timeout, nothing written", async () => {
  const slow: typeof fetch = (_url, init) =>
    new Promise((_res, rej) =>
      init?.signal?.addEventListener("abort", () => rej(new Error("abort"))),
    );
  const t = Date.now();
  await refreshLimits(ctx, { fetch: slow, now: T0, timeoutMs: 50 });
  expect(Date.now() - t).toBeLessThan(2000);
  expect(limitEvents()).toEqual([]);
});

it("no credential (missing file, bad JSON, no token): no call, nothing written", async () => {
  const file = path.join(claude, ".credentials.json");
  for (const content of [null, "{oops", JSON.stringify({ claudeAiOauth: {} })]) {
    rm(path.join(env.home, "cache"));
    if (content === null) fs.rmSync(file, { force: true });
    else fs.writeFileSync(file, content);
    await refreshLimits(ctx, { fetch: reply(BODY), now: T0 });
  }
  expect(calls).toEqual([]);
  expect(limitEvents()).toEqual([]);
});

it("HARNESS_NO_LIMITS disables the call", async () => {
  process.env.HARNESS_NO_LIMITS = "1";
  await refreshLimits(ctx, { fetch: reply(BODY), now: T0 });
  expect(calls).toEqual([]);
});

it("the token never reaches events, logs or cache files", async () => {
  await refreshLimits(ctx, { fetch: reply(BODY), now: T0 });
  await refreshLimits(ctx, {
    fetch: () => Promise.reject(new Error(TOKEN)),
    now: T0 + 6 * 60_000,
  });
  const walk = (d: string): string[] =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory()
          ? walk(path.join(d, e.name))
          : [fs.readFileSync(path.join(d, e.name), "utf8")],
      );
  expect(walk(env.home).join("\n")).not.toContain(TOKEN);
});

it("no reading yet: no line; exceeded window gives its resets_at", () => {
  expect(limitsLine()).toBeNull();
  const l = { five_hour: 100, five_hour_resets_at: "a", seven_day: 50, seven_day_resets_at: "b" };
  expect(exceededResetsAt(l)).toBe("a");
  expect(exceededResetsAt({ ...l, five_hour: 80, seven_day: 100 })).toBe("b");
  expect(exceededResetsAt({ ...l, five_hour: 80 })).toBeNull();
});
