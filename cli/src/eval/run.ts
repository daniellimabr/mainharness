// hx eval runner: Sonnet `claude -p` sessions (max 3 at once) in temp sandboxes, emitting usage.
// Each sandbox holds the skill in .claude/skills/<name>; 1 run per query; usage agent = "eval".
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { readJson, writeJson } from "../core/fsx";
import { logError } from "../core/log";
import { emit } from "../events/emit";
import { type EvalScope, type SkillResults, stampSkill } from "../release/skills";

export const PARALLEL = 3;
const TIMEOUT_MS = 10 * 60_000;
const MAX_FILE = 20_000;

export interface EvalContext {
  project: string;
  session: string | null;
  sprint: string | null;
}

interface Usage {
  model: string;
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
  usd: number | null;
}

export interface Session {
  text: string;
  skills: string[];
  sessionId: string;
  usage: Usage[];
}

interface StreamLine {
  type?: string;
  message?: { content?: { type?: string; name?: string; input?: { skill?: unknown } }[] };
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  modelUsage?: Record<
    string,
    {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationInputTokens?: number;
      cacheReadInputTokens?: number;
      costUSD?: number;
    }
  >;
}

/** Parses `--output-format stream-json` output: Skill tool calls, final answer, usage per model. */
export function parseStream(out: string): Session {
  const s: Session = { text: "", skills: [], sessionId: "", usage: [] };
  for (const line of out.split("\n")) {
    let o: StreamLine;
    try {
      o = JSON.parse(line) as StreamLine;
    } catch {
      continue;
    }
    if (o.type === "assistant")
      for (const c of o.message?.content ?? [])
        if (c.type === "tool_use" && c.name === "Skill" && typeof c.input?.skill === "string")
          s.skills.push(c.input.skill);
    if (o.type !== "result") continue;
    s.text = o.result ?? "";
    s.sessionId = o.session_id ?? "";
    const mu = Object.entries(o.modelUsage ?? {});
    const u = o.usage ?? {};
    s.usage = mu.length
      ? mu.map(([model, m]) => ({
          model,
          input: m.inputTokens ?? 0,
          output: m.outputTokens ?? 0,
          cache_write: m.cacheCreationInputTokens ?? 0,
          cache_read: m.cacheReadInputTokens ?? 0,
          usd: m.costUSD ?? null,
        }))
      : [
          {
            model: "sonnet",
            input: u.input_tokens ?? 0,
            output: u.output_tokens ?? 0,
            cache_write: u.cache_creation_input_tokens ?? 0,
            cache_read: u.cache_read_input_tokens ?? 0,
            usd: o.total_cost_usd ?? null,
          },
        ];
  }
  return s;
}

/** Runs `fn` over `items` with at most `limit` in flight; results keep input order. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (t: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i] as T);
      } catch (e) {
        failed = true; // stop opening sessions whose results would be thrown away
        throw e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const safeId = (s: string) => s.replace(/[^A-Za-z0-9._:@-]/g, "-").slice(0, 128);

/** One `claude -p` session; the prompt goes through stdin (no Windows quoting or length limits). */
async function claude(prompt: string, cwd: string, extra: string[], ctx: EvalContext) {
  // Fixed flags only on the command line; shell lets HX_CLAUDE_BIN / claude.cmd work on Windows.
  const bin = process.env.HX_CLAUDE_BIN || "claude";
  const args = ["-p", "--model", "sonnet", "--output-format", "stream-json", "--verbose"];
  const env = { ...process.env };
  delete env.CLAUDECODE;
  const s = await new Promise<Session>((resolve, reject) => {
    const child = spawn([bin, ...args, "--setting-sources", "project", ...extra].join(" "), {
      cwd,
      env,
      shell: true,
    });
    // spawn's own timeout only kills the shell on Windows; take down the whole tree.
    const timer = setTimeout(() => {
      if (process.platform === "win32" && child.pid)
        spawnSync("taskkill", ["/T", "/F", "/PID", String(child.pid)]);
      else child.kill();
    }, TIMEOUT_MS);
    child.on("close", () => clearTimeout(timer));
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => (out += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      const r = parseStream(out);
      if (!r.sessionId) reject(new Error(`claude -p falhou (${code}): ${err.trim().slice(-300)}`));
      else resolve(r);
    });
    child.stdin.end(prompt);
  });
  for (const u of s.usage) {
    try {
      emit({
        type: "usage",
        project: ctx.project,
        session: ctx.session,
        sprint: ctx.sprint,
        agent: "eval",
        data: { ...u, message_id: safeId(`${s.sessionId}:${u.model}`), transcript: "subagent" },
      });
    } catch (e) {
      logError("eval", e);
    }
  }
  return s;
}

/** Temp folder with the skill (minus evals/) at .claude/skills/<name>; null = baseline. */
async function inSandbox<R>(skillDir: string | null, fn: (dir: string) => Promise<R>): Promise<R> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hx-eval-"));
  try {
    if (skillDir)
      fs.cpSync(skillDir, path.join(dir, ".claude", "skills", path.basename(skillDir)), {
        recursive: true,
        filter: (src) => path.relative(skillDir, src).split(path.sep)[0] !== "evals",
      });
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Text files the session wrote in the sandbox (outside .claude), truncated, for the judge. */
function outputs(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.name === ".claude" || e.name === ".git") continue;
    if (e.isDirectory()) out.push(...outputs(p, base));
    else {
      const rel = path.relative(base, p).split(path.sep).join("/");
      out.push(`<file path="${rel}">\n${fs.readFileSync(p, "utf8").slice(0, MAX_FILE)}\n</file>`);
    }
  }
  return out;
}

interface TriggerQuery {
  query: string;
  should_trigger: boolean;
}
interface EvalCase {
  id: number | string;
  prompt: string;
  expected_output?: string;
  expectations: string[];
}
interface Verdict {
  id: string;
  passed: boolean;
  failed?: string[];
}

const frac = (xs: boolean[]) => ({ passed: xs.filter(Boolean).length, total: xs.length });

/**
 * Runs the evals the scope asks for and stamps evals/results.json (keeping the block that did not
 * run). Trigger passes with at most 1 miss (single noisy run per query); cases must all pass.
 */
export async function evalSkill(
  repo: string,
  skill: string,
  scope: EvalScope,
  ctx: EvalContext,
): Promise<SkillResults> {
  const dir = path.join(repo, skill);
  const name = path.basename(dir);
  const evalsDir = path.join(dir, "evals");
  const need = (f: string) => {
    if (!fs.existsSync(path.join(evalsDir, f))) throw new Error(`${skill}: falta evals/${f}`);
    return path.join(evalsDir, f);
  };
  const prev = readJson<SkillResults | null>(path.join(evalsDir, "results.json"), null);
  const date = new Date().toISOString();
  let trigger = prev?.trigger;
  let evals = prev?.evals;
  let ok = true;
  let notes: string | undefined;

  if (scope.trigger) {
    const qs = readJson<TriggerQuery[]>(need("trigger.json"), []);
    // ponytail: max-turns 2 stops a triggered skill from doing the whole task; Skill is called first.
    const results = await pool(qs, PARALLEL, (q) =>
      inSandbox(dir, async (sb) => {
        const s = await claude(q.query, sb, ["--max-turns", "2"], ctx);
        const triggered = s.skills.includes(name);
        return { ...q, triggered, passed: triggered === q.should_trigger };
      }),
    );
    writeJson(path.join(evalsDir, "trigger-results.json"), { date, results });
    trigger = frac(results.map((r) => r.passed));
    ok &&= trigger.passed >= trigger.total - 1;
  }

  if (scope.evals) {
    const cases = readJson<{ evals: EvalCase[] }>(need("evals.json"), { evals: [] }).evals;
    const runs = [
      ...cases.map((c) => ({ id: String(c.id), c, withSkill: true })),
      ...(scope.isNew ? cases.map((c) => ({ id: `baseline-${c.id}`, c, withSkill: false })) : []),
    ];
    const done = await pool(runs, PARALLEL, (r) =>
      inSandbox(r.withSkill ? dir : null, async (sb) => {
        const s = await claude(r.c.prompt, sb, ["--permission-mode", "acceptEdits"], ctx);
        return { ...r, answer: s.text, files: outputs(sb) };
      }),
    );
    // One judge session grades every run (cheaper than one judge per case, independent of the run).
    const judge = await inSandbox(null, (sb) =>
      claude(
        [
          "You are grading skill eval runs. For each run, decide if EVERY expectation holds, using",
          "only the run's final answer and files. Reply with JSON only:",
          '{"results":[{"id":"<run id>","passed":true,"failed":["<expectation not met>"]}]}',
          ...done.map((r) =>
            [
              `<run id="${r.id}">`,
              `<prompt>\n${r.c.prompt}\n</prompt>`,
              `<expectations>\n${r.c.expectations.map((e) => `- ${e}`).join("\n")}\n</expectations>`,
              `<answer>\n${r.answer}\n</answer>`,
              ...r.files,
              "</run>",
            ].join("\n"),
          ),
        ].join("\n"),
        sb,
        ["--max-turns", "1"],
        ctx,
      ),
    );
    let verdicts: Verdict[] = [];
    try {
      const t = judge.text;
      verdicts = (
        JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)) as { results: Verdict[] }
      ).results;
    } catch {
      logError("eval", `judge sem JSON: ${judge.text.slice(0, 200)}`);
    }
    const graded = done.map((r) => {
      const v = verdicts.find((x) => String(x.id) === r.id);
      return {
        id: r.id,
        baseline: !r.withSkill,
        passed: v?.passed === true,
        failed: v ? (v.failed ?? []) : ["sem veredito do juiz"],
        answer: r.answer.slice(0, 2000),
      };
    });
    writeJson(path.join(evalsDir, "cases-results.json"), { date, runs: graded });
    evals = frac(graded.filter((g) => !g.baseline).map((g) => g.passed));
    ok &&= evals.passed === evals.total;
    if (scope.isNew) {
      const b = frac(graded.filter((g) => g.baseline).map((g) => g.passed));
      notes = `baseline sem skill: ${b.passed}/${b.total}`;
    }
  }

  return stampSkill(repo, skill, { passed: ok, trigger, evals, notes });
}
