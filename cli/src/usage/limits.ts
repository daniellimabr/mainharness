// B064: plan usage % (5 h and weekly) from the endpoint behind Claude Code's /usage.
// Undocumented endpoint, accepted as an exception to "official paths only" (ADR 0010).
import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig } from "../core/config";
import { claudeHome, harnessHome } from "../core/paths";
import { emit, readEvents } from "../events/emit";

const URL = "https://api.anthropic.com/api/oauth/usage";
const EVERY_MS = 5 * 60_000;
const TIMEOUT_MS = 3000;

/** Data of the usage.limits event (one % and reset time per limit_window). */
export interface Limits {
  five_hour: number;
  five_hour_resets_at: string | null;
  seven_day: number;
  seven_day_resets_at: string | null;
}

interface Ctx {
  project: string;
  session: string | null;
  sprint: string | null;
}

interface Deps {
  fetch?: typeof fetch;
  now?: number;
  timeoutMs?: number;
  force?: boolean;
}

function readToken(): string | null {
  try {
    const raw = fs.readFileSync(path.join(claudeHome(), ".credentials.json"), "utf8");
    const t = (JSON.parse(raw) as { claudeAiOauth?: { accessToken?: unknown } }).claudeAiOauth
      ?.accessToken;
    return typeof t === "string" && t ? t : null;
  } catch {
    return null;
  }
}

function window(v: unknown): { pct: number; resets_at: string | null } | null {
  const w = v as { utilization?: unknown; resets_at?: unknown } | null;
  if (typeof w?.utilization !== "number" || !Number.isFinite(w.utilization)) return null;
  const t = typeof w.resets_at === "string" ? Date.parse(w.resets_at) : NaN;
  return { pct: w.utilization, resets_at: isNaN(t) ? null : new Date(t).toISOString() };
}

function parse(body: unknown): Limits | null {
  const b = body as Record<string, unknown> | null;
  const f = window(b?.five_hour);
  const s = window(b?.seven_day);
  if (!f || !s) return null;
  return {
    five_hour: f.pct,
    five_hour_resets_at: f.resets_at,
    seven_day: s.pct,
    seven_day_resets_at: s.resets_at,
  };
}

/**
 * Fetches the limits in the Stop at most every 5 min (`force` skips the wait: limit just hit).
 * Returns the reading it recorded; any failure is silent (no event, no log).
 */
export async function refreshLimits(ctx: Ctx, deps: Deps = {}): Promise<Limits | undefined> {
  if (process.env.HARNESS_NO_LIMITS) return;
  try {
    const now = deps.now ?? Date.now();
    const mark = path.join(harnessHome(), "cache", "limits.json");
    try {
      const last = (JSON.parse(fs.readFileSync(mark, "utf8")) as { checkedAt?: number }).checkedAt;
      if (!deps.force && typeof last === "number" && now - last < EVERY_MS) return;
    } catch {
      // no mark yet
    }
    const token = readToken();
    if (!token) return;
    // Mark before the call: a failing endpoint (429, timeout) is not retried on every Stop.
    fs.mkdirSync(path.dirname(mark), { recursive: true });
    fs.writeFileSync(mark, JSON.stringify({ checkedAt: now }));
    const res = await (deps.fetch ?? fetch)(URL, {
      headers: { Authorization: `Bearer ${token}`, "anthropic-beta": "oauth-2025-04-20" },
      signal: AbortSignal.timeout(deps.timeoutMs ?? TIMEOUT_MS),
      redirect: "error",
    });
    if (!res.ok) return;
    const data = parse(await res.json());
    if (data) emit({ type: "usage.limits", ...ctx, data: { ...data } });
    return data ?? undefined;
  } catch {
    // silent by design: the error could carry request details
  }
}

/** Last usage.limits recorded (account-wide, any project). */
export function lastLimits(): Limits | null {
  const evs = readEvents((e) => e.type === "usage.limits");
  return (evs[evs.length - 1]?.data as Limits | undefined) ?? null;
}

/** "Limite: 5 h 42% · semana 18%", or null before the first reading. */
export function limitsLine(): string | null {
  const l = lastLimits();
  if (!l) return null;
  return `Limite: 5 h ${Math.round(l.five_hour)}% · semana ${Math.round(l.seven_day)}%`;
}

/** S10/T07: nudge toward the Gemini worker when a window is at the threshold; once per session. */
export function workerNudge(session: string | null): string | null {
  const l = lastLimits();
  const t = loadConfig().worker.threshold;
  const hit = !l
    ? null
    : l.five_hour >= t
      ? `${Math.round(l.five_hour)}% (5 h)`
      : l.seven_day >= t
        ? `${Math.round(l.seven_day)}% (semana)`
        : null;
  if (!hit) return null;
  const mark = path.join(harnessHome(), "cache", "worker-nudge.json");
  try {
    if ((JSON.parse(fs.readFileSync(mark, "utf8")) as { session?: unknown }).session === session)
      return null;
  } catch {
    // no mark yet
  }
  fs.mkdirSync(path.dirname(mark), { recursive: true });
  fs.writeFileSync(mark, JSON.stringify({ session }));
  return `Uso do Claude em ${hit}. Delegue tarefas de escopo fechado ao trabalhador Gemini (skill worker).`;
}

/** For T05: resets_at of the window that ran out (weekly wins, it lasts longer); null if none. */
export function exceededResetsAt(l: Limits): string | null {
  if (l.seven_day >= 100) return l.seven_day_resets_at;
  if (l.five_hour >= 100) return l.five_hour_resets_at;
  return null;
}
