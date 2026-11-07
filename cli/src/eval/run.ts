// hx eval runner: Sonnet `claude -p` sessions (max 3 at once) in temp sandboxes, emitting usage.
// Each sandbox holds the skill in .claude/skills/<name>; 1 run per query; usage agent = "eval".
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadConfig } from "../core/config";
import { readJson, writeJson } from "../core/fsx";
import { logError } from "../core/log";
import { writeShims } from "../core/shim";
import { emit } from "../events/emit";
import { type EvalScope, type SkillResults, skillHash, stampSkill } from "../release/skills";

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
  /** Final message (the judge's JSON reply). */
  text: string;
  /** Every assistant text in order: what a graded run showed, including a plan written before tool calls. */
  answer: string;
  skills: string[];
  sessionId: string;
  usage: Usage[];
}

interface StreamLine {
  type?: string;
  message?: {
    content?: {
      type?: string;
      name?: string;
      text?: string;
      input?: { skill?: unknown; prompt?: unknown };
    }[];
  };
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
  const s: Session = { text: "", answer: "", skills: [], sessionId: "", usage: [] };
  const texts: string[] = [];
  for (const line of out.split("\n")) {
    let o: StreamLine;
    try {
      o = JSON.parse(line) as StreamLine;
    } catch {
      continue;
    }
    if (o.type === "assistant")
      for (const c of o.message?.content ?? []) {
        if (c.type === "text" && c.text) texts.push(c.text);
        if (c.type === "tool_use" && c.name === "Skill" && typeof c.input?.skill === "string")
          s.skills.push(c.input.skill);
        // the judge must see what was delegated (handoff text), not only the final summary
        if (
          c.type === "tool_use" &&
          (c.name === "Agent" || c.name === "Task") &&
          typeof c.input?.prompt === "string"
        )
          texts.push(`[prompt enviado ao subagente]\n${c.input.prompt}`);
      }
    if (o.type !== "result") continue;
    s.text = o.result ?? "";
    s.answer = texts.length ? texts.join("\n\n") : s.text;
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
  // hx calls made by the session write to a throwaway home, never the real ~/.harness.
  const env: NodeJS.ProcessEnv = { ...process.env, HARNESS_HOME: path.join(cwd, ".hx-home") };
  delete env.CLAUDECODE;
  // `hx` in the session runs the harness repo bundle (what will ship), not the stable one.
  const shims = path.join(cwd, ".hx-home", "bin");
  writeShims(loadConfig().harnessRepo, shims);
  const pathKey = Object.keys(env).find((k) => /^path$/i.test(k)) ?? "PATH";
  env[pathKey] = [shims, env[pathKey]].filter(Boolean).join(path.delimiter);
  // The sandbox must never inherit the real harness paths.
  delete env.HARNESS_REPO;
  delete env.HARNESS_STABLE_DIR;
  delete env.HARNESS_INBOX;
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

/**
 * Temp folder with the skill (minus evals/) at .claude/skills/<name>; null = baseline. `files` are
 * fixtures under evals/files/, copied to the same relative path in the sandbox root.
 */
async function inSandbox<R>(
  skillDir: string | null,
  fn: (dir: string) => Promise<R>,
  files: string[] = [],
  evalsDir = "",
): Promise<R> {
  // Long path: Claude Code asks for approval on 8.3 paths (DANIEL~1), and -p cannot approve.
  const dir = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), "hx-eval-"));
  try {
    for (const f of files) {
      // First segment is the fixture set (files/, files-approved/, ...); the rest is sandbox-relative.
      const [set = "", ...parts] = f.split(/[\\/]/);
      const rel = path.join(...parts);
      if (!set.startsWith("files") || !parts.length || rel.startsWith("..") || path.isAbsolute(rel))
        throw new Error(`fixture fora de files*/: ${f}`);
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.copyFileSync(path.join(evalsDir, f), path.join(dir, rel));
    }
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
  /** Fixtures relative to evals/, in a files* set (files/docs/adr/0003-x.md → docs/adr/0003-x.md). */
  files?: string[];
}
interface Verdict {
  id: string;
  passed: boolean;
  failed?: string[];
}

// shortcut: keyword heuristic, misses paraphrases; upgrade if audits find false negatives.
const ASSUMES_REPO = /\bsprint\b|\bS\d{2}\b|release report|repo conectado|\bhx /i;

/** Case without fixtures whose prompt assumes a connected repo, a sprint or a report. */
export const needsFixtures = (c: { prompt: string; files?: string[] }): boolean =>
  !c.files?.length && ASSUMES_REPO.test(c.prompt);

/**
 * Majority of up to 3: a pass on the first try is final (no repeat); a miss reruns, and 2 of 3 wins.
 * Two misses stop early (majority impossible). Each round batches the pending items through `attempt`.
 */
export async function majority<T, R extends { passed: boolean }>(
  items: T[],
  attempt: (xs: T[]) => Promise<R[]>,
  retry: (x: T) => boolean = () => true,
): Promise<(R & { attempts: number })[]> {
  const st = items.map(() => ({ wins: 0, runs: 0, last: undefined as R | undefined }));
  let todo = st.map((_, i) => i);
  while (todo.length) {
    const rs = await attempt(todo.map((i) => items[i] as T));
    todo.forEach((i, k) => {
      const s = st[i] as (typeof st)[number];
      s.last = rs[k];
      s.runs++;
      if (rs[k]?.passed) s.wins++;
    });
    todo = todo.filter((i) => {
      const s = st[i] as (typeof st)[number];
      return s.runs - s.wins === 1 && s.wins < 2 && retry(items[i] as T);
    });
  }
  return st.map((s) => ({
    ...(s.last as R),
    passed: s.wins > s.runs - s.wins,
    attempts: s.runs,
  }));
}

const frac = (xs: boolean[]) => ({ passed: xs.filter(Boolean).length, total: xs.length });

/**
 * Runs the evals the scope asks for and stamps evals/results.json (keeping the block that did not
 * run). Trigger passes with at most 1 miss (single noisy run per query); cases must all pass.
 * `failed`: rerun only what failed last time (same skill hash), merging with what passed.
 */
export async function evalSkill(
  repo: string,
  skill: string,
  scope: EvalScope,
  ctx: EvalContext,
  opts: { failed?: boolean } = {},
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
  const reuse = !!opts.failed && !!prev && prev.skillSha256 === skillHash(dir);
  if (opts.failed && prev && !reuse)
    console.warn("skill mudou desde a última rodada: rodando tudo");
  // Previous results kept as-is (passed, or baseline: expected to fail, not worth rerunning).
  const kept = <T>(file: string, key: string, keep: (r: T) => boolean): T[] =>
    reuse
      ? (readJson<Record<string, T[]>>(path.join(evalsDir, file), {})[key] ?? []).filter(keep)
      : [];

  if (scope.trigger) {
    const qs = readJson<TriggerQuery[]>(need("trigger.json"), []);
    const old = kept<TriggerQuery & { passed: boolean }>(
      "trigger-results.json",
      "results",
      (r) => r.passed,
    );
    const find = (q: TriggerQuery) => old.find((o) => o.query === q.query);
    // ponytail: max-turns 2 stops a triggered skill from doing the whole task; Skill is called first.
    const fresh = await majority(
      qs.filter((q) => !find(q)),
      (xs) =>
        pool(xs, PARALLEL, (q) =>
          inSandbox(dir, async (sb) => {
            const s = await claude(q.query, sb, ["--max-turns", "2"], ctx);
            const triggered = s.skills.includes(name);
            return { ...q, triggered, skills: s.skills, passed: triggered === q.should_trigger };
          }),
        ),
    );
    const results = qs.flatMap((q) => find(q) ?? fresh.filter((f) => f.query === q.query));
    writeJson(path.join(evalsDir, "trigger-results.json"), { date, results });
    trigger = frac(results.map((r) => r.passed));
    ok &&= trigger.passed >= trigger.total - 1;
  }

  if (scope.evals) {
    const cases = readJson<{ evals: EvalCase[] }>(need("evals.json"), { evals: [] }).evals;
    for (const c of cases.filter(needsFixtures))
      console.warn(
        `${skill}: caso ${c.id} sem files, mas o prompt pressupõe repo conectado/sprint/relatório (evals/files*/.hx-home/config.json)`,
      );
    const runs = [
      ...cases.map((c) => ({ id: String(c.id), c, withSkill: true })),
      ...(scope.isNew ? cases.map((c) => ({ id: `baseline-${c.id}`, c, withSkill: false })) : []),
    ];
    const old = kept<{ id: string; passed: boolean; baseline: boolean }>(
      "cases-results.json",
      "runs",
      (g) => g.passed || g.baseline,
    );
    const find = (id: string) => old.find((g) => g.id === id);
    const exec = (rs: typeof runs) =>
      pool(rs, PARALLEL, (r) =>
        inSandbox(
          r.withSkill ? dir : null,
          async (sb) => {
            // Edits stay in the sandbox; Bash only for hx (isolated HARNESS_HOME), as skills call it.
            const perms = ["--permission-mode", "acceptEdits", "--allowedTools", '"Bash(hx:*)"'];
            const s = await claude(r.c.prompt, sb, perms, ctx);
            return { ...r, answer: s.answer, skills: s.skills, files: outputs(sb) };
          },
          r.c.files,
          evalsDir,
        ),
      );
    type Done = Awaited<ReturnType<typeof exec>>;
    // One judge session grades every run (cheaper than one judge per case, independent of the run).
    const judge = async (rs: Done): Promise<Verdict[]> => {
      if (!rs.length) return [];
      const { text } = await inSandbox(null, (sb) =>
        claude(
          [
            "You are grading skill eval runs. For each run, decide if EVERY expectation holds, using",
            "only the run's final answer and files. Reply with JSON only:",
            '{"results":[{"id":"<run id>","passed":true,"failed":["<expectation not met>"]}]}',
            ...rs.map((r) =>
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
      try {
        return (
          (
            JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
              results?: Verdict[];
            }
          ).results ?? []
        );
      } catch {
        logError("eval", `judge sem JSON: ${text.slice(0, 200)}`);
        return [];
      }
    };
    const has = (vs: Verdict[], id: string) => vs.some((x) => String(x.id) === id);
    const grade = async (rs: typeof runs) => {
      const done = await exec(rs);
      const graded1 = await judge(done);
      // Retry once, judge only: runs left without a verdict (bad JSON or omitted id).
      const verdicts = [...graded1, ...(await judge(done.filter((r) => !has(graded1, r.id))))];
      return done.map((r) => {
        const v = verdicts.find((x) => String(x.id) === r.id);
        return {
          id: r.id,
          baseline: !r.withSkill,
          passed: v?.passed === true,
          failed: v ? (v.failed ?? []) : ["sem veredito do juiz"],
          skills: r.skills,
          answer: r.answer.slice(0, 2000),
        };
      });
    };
    // Baselines are expected to fail: one execution only, never the majority rerun.
    const fresh = await majority(
      runs.filter((r) => !find(r.id)),
      grade,
      (r) => r.withSkill,
    );
    const graded = runs.flatMap((r) => find(r.id) ?? fresh.filter((g) => g.id === r.id));
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
