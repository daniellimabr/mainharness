// S12 experiment: one run of a challenge on one model, in a temp clone, under the same conditions
// for every model (docs/experiments/S12-protocolo.md). Writes <challenge>-<model>.json and .patch.
// usage: node scripts/bench.mjs <desafio> <opus|sonnet|gemini> [--base <commit>] [--repo <dir>]
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const TOOLS = "Read,Edit,Write,Glob,Grep,Bash,PowerShell"; // same as hx worker run
const TIMEOUT_MS = Number(process.env.HX_BENCH_TIMEOUT_MS) || 60 * 60_000;
const USAGE =
  "uso: node scripts/bench.mjs <desafio> <opus|sonnet|gemini> [--base <commit>] [--repo <dir>]";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const root = path.resolve(flag("--repo") ?? path.join(import.meta.dirname, ".."));
const baseArg = flag("--base") ?? "HEAD";
const [challenge, model] = args;
if (!challenge || !/^[\w-]+$/.test(challenge) || !["opus", "sonnet", "gemini"].includes(model)) {
  console.error(USAGE);
  process.exit(1);
}
const outDir = path.join(root, "docs", "experiments", "S12");
const handoff = fs.readFileSync(path.join(outDir, `${challenge}.md`), "utf8");
const hiddenDir = path.join(outDir, "hidden", challenge);

// Gemini: same env as hx worker run, token only from ~/.harness/config.json (read before HARNESS_HOME moves).
const realHome = process.env.HARNESS_HOME || path.join(os.homedir(), ".harness");
let token = "";
const env = { ...process.env };
delete env.CLAUDECODE; // a nested session must not think it runs inside the parent chat
let modelId = model;
if (model === "gemini") {
  let w = {};
  try {
    w = JSON.parse(fs.readFileSync(path.join(realHome, "config.json"), "utf8")).worker ?? {};
  } catch {
    // no config: fails below
  }
  if (!w.token) {
    console.error("Gemini: falta worker.token em ~/.harness/config.json.");
    process.exit(1);
  }
  token = w.token;
  modelId = w.model || "gemini/gemini-3.5-flash-lite";
  Object.assign(env, {
    ANTHROPIC_BASE_URL: w.url || "http://localhost:20128",
    ANTHROPIC_AUTH_TOKEN: token,
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_MODEL: modelId,
    ANTHROPIC_DEFAULT_OPUS_MODEL: modelId,
    ANTHROPIC_DEFAULT_SONNET_MODEL: modelId,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: modelId,
    CLAUDE_CODE_SUBAGENT_MODEL: modelId,
  });
}
const mask = (s) => (token ? String(s).split(token).join("***") : String(s));

/** Runs a shell command; output is masked before anyone sees it. */
function sh(cmd, cwd) {
  const r = spawnSync(cmd, { cwd, env, shell: true, encoding: "utf8", windowsHide: true });
  return { ok: r.status === 0, out: mask(`${r.stdout ?? ""}${r.stderr ?? ""}`) };
}
function must(cmd, cwd) {
  const r = sh(cmd, cwd);
  if (!r.ok) throw new Error(`${cmd}\n${r.out}`);
  return r.out.trim();
}

/** Plan usage % (5 h and week) from the endpoint behind /usage, same as hx (limits.ts); null if unavailable. */
async function limits() {
  if (process.env.HARNESS_NO_LIMITS) return null;
  try {
    const cred = path.join(
      process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"),
      ".credentials.json",
    );
    const t = JSON.parse(fs.readFileSync(cred, "utf8")).claudeAiOauth?.accessToken;
    if (!t) return null;
    const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: { Authorization: `Bearer ${t}`, "anthropic-beta": "oauth-2025-04-20" },
      signal: AbortSignal.timeout(3000),
      redirect: "error",
    });
    if (!res.ok) return null;
    const b = await res.json();
    return {
      five_hour: b.five_hour?.utilization ?? null,
      seven_day: b.seven_day?.utilization ?? null,
    };
  } catch {
    return null; // silent: the error could carry request details
  }
}

/** vitest with a json report: ok plus pass/fail counts (null when the report is missing). */
function tests(clone, files = "") {
  const report = path.join(clone, `.bench-${Date.now()}.json`);
  const r = sh(`npm test -- ${files} --reporter=json --outputFile="${report}"`, clone);
  let j = {};
  try {
    j = JSON.parse(fs.readFileSync(report, "utf8"));
  } catch {
    // reporter did not run
  }
  fs.rmSync(report, { force: true });
  return { ok: r.ok, passed: j.numPassedTests ?? null, failed: j.numFailedTests ?? null };
}

const base = must(`git rev-parse "${baseArg}^{commit}"`, root);
const clone = fs.mkdtempSync(path.join(os.tmpdir(), "hx-bench-"));
env.HARNESS_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "hx-bench-home-"));
try {
  must(`git clone -q --no-hardlinks "${root}" "${clone}"`);
  must(`git checkout -q ${base}`, clone);
  must("npm ci --no-audit --no-fund", clone); // before the clock starts

  const before = await limits();
  const bin = process.env.HX_CLAUDE_BIN || "claude";
  const modelFlag = model === "gemini" ? modelId : model;
  const t0 = Date.now();
  const run = await new Promise((resolve) => {
    const c = spawn(
      `${bin} -p --output-format json --model ${modelFlag} --agent main-harness:executor --allowedTools ${TOOLS}`,
      { cwd: clone, env, shell: true, windowsHide: true },
    );
    let out = "";
    let err = "";
    let timedOut = false;
    // spawn's timeout only kills the shell on Windows
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === "win32" && c.pid)
        spawnSync("taskkill", ["/T", "/F", "/PID", String(c.pid)]);
      else c.kill("SIGKILL");
    }, TIMEOUT_MS);
    c.stdin.on("error", () => {});
    c.stdout.setEncoding("utf8").on("data", (d) => (out += d));
    c.stderr.setEncoding("utf8").on("data", (d) => (err += d));
    c.on("error", (e) => (err += e.message));
    c.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, out, err, timedOut });
    });
    c.stdin.end(handoff);
  });
  const duration_s = Math.round((Date.now() - t0) / 1000);
  const after = await limits();

  let res = {};
  try {
    res = JSON.parse(run.out);
  } catch {
    // killed or crashed: no result json
  }
  // shortcut: counts "429" in stderr and the final text, not per API call; upgrade to stream-json if it matters
  const errors_429 = (
    `${run.err}\n${res.result ?? (res.type ? "" : run.out)}`.match(/\b429\b/g) ?? []
  ).length;

  // Diff of the model's work only: before hidden tests and before the build touches cli/dist.
  must("git add -A", clone);
  const patch = mask(sh(`git diff --cached ${base} -- . ":(exclude)cli/dist"`, clone).out);
  const diff_lines = must(`git diff --cached --numstat ${base} -- . ":(exclude)cli/dist"`, clone)
    .split("\n")
    .reduce((n, l) => n + (Number(l.split("\t")[0]) || 0) + (Number(l.split("\t")[1]) || 0), 0);

  const lint = {
    typecheck: sh("npm run typecheck", clone).ok,
    eslint: sh("npm run lint", clone).ok,
    format: sh("npm run format:check", clone).ok,
  };
  sh("npm run build", clone); // tests run the bundled hx.js
  const acceptance = tests(clone, "cli/test/worker-run.test.ts"); // same command as the handoff
  let hidden = null;
  if (fs.existsSync(hiddenDir)) {
    const files = fs
      .readdirSync(hiddenDir, { recursive: true, withFileTypes: true })
      .filter((f) => f.isFile())
      .map(
        (f) =>
          `"${path.relative(hiddenDir, path.join(f.parentPath, f.name)).replaceAll("\\", "/")}"`,
      );
    fs.cpSync(hiddenDir, clone, { recursive: true }); // only now: the model never saw them
    hidden = tests(clone, files.join(" "));
  }

  const u = res.usage ?? {};
  const result = {
    challenge,
    model,
    model_id: modelId,
    base,
    duration_s,
    turns: res.num_turns ?? null,
    tokens: {
      input: u.input_tokens ?? null,
      output: u.output_tokens ?? null,
      cache_read: u.cache_read_input_tokens ?? null,
      cache_creation: u.cache_creation_input_tokens ?? null,
    },
    cost_usd: res.total_cost_usd ?? null,
    exit_code: run.code,
    timed_out: run.timedOut,
    errors_429,
    limits_before: before,
    limits_after: after,
    diff_lines,
    lint,
    acceptance,
    hidden,
  };
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${challenge}-${model}`);
  fs.writeFileSync(`${file}.json`, mask(JSON.stringify(result, null, 2)) + "\n");
  fs.writeFileSync(`${file}.patch`, patch);
  console.log(`Corrida gravada: ${file}.json (${duration_s} s, saída ${run.code}).`);
} catch (e) {
  console.error(mask(e.message));
  process.exitCode = 1;
} finally {
  for (const d of [clone, env.HARNESS_HOME])
    fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
