// S12 experiment: one run of a challenge on one model, in a temp clone, under the same conditions
// for every model (docs/experiments/S12-protocolo.md). Writes <challenge>-<model>.json and .patch.
// usage: node scripts/bench.mjs <desafio> <opus|sonnet|gemini> [--perfil atual|leve|leve-plugins|sem-dashboard] [--rep N] [--base <commit>] [--repo <dir>]
//        node scripts/bench.mjs --abertura <perfil>   (3x `claude -p ok`, median in S16/abertura-<perfil>.json)
//
// S16 profiles (docs/experiments/S16-protocolo.md). Without --perfil: old behavior, output in S15.
// - atual: the harness as installed, nothing changed.
// - sem-dashboard: atual with HARNESS_DASHBOARD=off in the claude process.
// - leve, mechanism (flags of `claude -p` only; nothing outside the temp dirs is touched):
//   1. a temp copy of the plugin named main-harness (plugin.json, scripts/perfil-leve/hooks.json,
//      agents/executor.md, skills tdd-workflow + handoff, cli/dist/hx.js) loaded with --plugin-dir,
//      so --agent main-harness:executor resolves to the lean executor;
//   2. --settings <file> with enabledPlugins false for every installed plugin (harness included, so the
//      installed copy never competes; ponytail, remember, claude-code-setup, security-guidance, others);
//   3. --setting-sources project,local drops the user settings (hooks, env, plugins);
//   4. in the clone, CLAUDE.md is replaced by scripts/perfil-leve/CLAUDE.md and .claude/ is removed
//      (repo hooks and skill-creator), then restored with git checkout before the diff is taken.
//   Not isolated: ~/.claude/CLAUDE.md and the user auto-memory may still load (no flag excludes them
//   without CLAUDE_CONFIG_DIR, which would also lose the login); MCP servers are not touched.
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const TOOLS = "Read,Edit,Write,Glob,Grep,Bash,PowerShell"; // same as hx worker run
const TIMEOUT_MS = Number(process.env.HX_BENCH_TIMEOUT_MS) || 60 * 60_000;
const USAGE =
  "uso: node scripts/bench.mjs <desafio> <opus|sonnet|apelido-de-workers> [--perfil atual|leve|leve-plugins|sem-dashboard] [--rep N] [--base <commit>] [--repo <dir>]\n     node scripts/bench.mjs --abertura <atual|leve|leve-plugins|sem-dashboard>";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const root = path.resolve(flag("--repo") ?? path.join(import.meta.dirname, ".."));
const baseArg = flag("--base") ?? "HEAD";
const perfilArg = flag("--perfil");
const abertura = flag("--abertura");
const rep = flag("--rep"); // repetition n>1 adds -rN to the output name
const perfil = abertura ?? perfilArg;
const [challenge, model] = abertura ? [undefined, "sonnet"] : args;
if (
  (perfil !== undefined && !["atual", "leve", "leve-plugins", "sem-dashboard"].includes(perfil)) ||
  (!abertura && (!challenge || !/^[\w-]+$/.test(challenge) || !model || !/^[\w-]+$/.test(model)))
) {
  console.error(USAGE);
  process.exit(1);
}
const outDir = path.join(root, "docs", "experiments", perfil ? "S16" : "S15");
fs.mkdirSync(outDir, { recursive: true });
// Challenges keep their handoff and hidden tests in the sprint folder that created them (S12: 1, 2; S14: 3).
const chDir = ["S14", "S12"]
  .map((s) => path.join(root, "docs", "experiments", s))
  .find((d) => fs.existsSync(path.join(d, `${challenge}.md`)));
const handoff = abertura ? "" : fs.readFileSync(path.join(chDir, `${challenge}.md`), "utf8");
const hiddenDir = path.join(chDir ?? "", "hidden", String(challenge));
const ACCEPTANCE =
  challenge === "desafio-3" ? "cli/test/worker.test.ts" : "cli/test/worker-run.test.ts";

// Gemini: same env as hx worker run, token only from ~/.harness/config.json (read before HARNESS_HOME moves).
const realHome = process.env.HARNESS_HOME || path.join(os.homedir(), ".harness");
let token = "";
const env = { ...process.env };
delete env.CLAUDECODE; // a nested session must not think it runs inside the parent chat
let modelId = model;
if (model !== "opus" && model !== "sonnet") {
  let w;
  try {
    const all = JSON.parse(fs.readFileSync(path.join(realHome, "config.json"), "utf8")).workers;
    w = all && Object.hasOwn(all, model) ? all[model] : undefined;
  } catch {
    // no config: fails below
  }
  if (!w?.token || !w.model || !w.url) {
    console.error(
      `Apelido ${model}: falta em workers de ~/.harness/config.json (url, model, token).`,
    );
    process.exit(1);
  }
  if (!/^[A-Za-z0-9._:/@-]{1,128}$/.test(w.model)) {
    console.error(`Apelido ${model}: modelo com caracteres inválidos.`);
    process.exit(1);
  }
  token = w.token;
  modelId = w.model;
  Object.assign(env, {
    ANTHROPIC_BASE_URL: w.url,
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
/** claude -p prints the result json plus warnings on stderr: parse the {...} span. */
function parseJson(out) {
  return JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
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

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

/** Builds the temp copy of the plugin with the lean files (profile leve); returns the claude flags. */
function buildLeve(dest, hxJs, keepPlugins) {
  const lean = path.join(root, "scripts", "perfil-leve");
  const put = (from, to) => {
    fs.mkdirSync(path.dirname(path.join(dest, to)), { recursive: true });
    fs.cpSync(from, path.join(dest, to), { recursive: true });
  };
  put(path.join(root, ".claude-plugin", "plugin.json"), ".claude-plugin/plugin.json");
  put(path.join(lean, "hooks.json"), "hooks/hooks.json");
  put(path.join(lean, "agents", "executor.md"), "agents/executor.md");
  for (const sk of ["tdd-workflow", "handoff"]) {
    put(path.join(root, "skills", sk), `skills/${sk}`);
    fs.rmSync(path.join(dest, "skills", sk, "evals"), { recursive: true, force: true });
  }
  put(hxJs, "cli/dist/hx.js");
  // leve-plugins keeps the companion plugins Daniel values (S16 feedback); the rest stays off.
  const companions = [
    "ponytail@ponytail",
    "remember@claude-plugins-official",
    "claude-code-setup@claude-plugins-official",
    "security-guidance@claude-plugins-official",
  ];
  const off = [
    "main-harness@harness-stable",
    ...(keepPlugins ? [] : companions),
    "superpowers@claude-plugins-official",
    "understand-anything@understand-anything",
    "ecc@ecc",
  ];
  const settings = path.join(dest, "..", "settings.json");
  fs.writeFileSync(
    settings,
    JSON.stringify({ enabledPlugins: Object.fromEntries(off.map((k) => [k, false])) }),
  );
  // leve-plugins needs the user source: that is where the companion plugins are enabled.
  return `--plugin-dir "${dest}" --settings "${settings}" --setting-sources ${keepPlugins ? "user,project,local" : "project,local"}`;
}

/** Prepares the clone and env for the profile; returns the extra flags for claude. */
function prepare(name, clone, tmp) {
  if (name === "sem-dashboard") env.HARNESS_DASHBOARD = "off";
  if (name !== "leve" && name !== "leve-plugins") return "";
  fs.cpSync(path.join(root, "scripts", "perfil-leve", "CLAUDE.md"), path.join(clone, "CLAUDE.md"));
  fs.rmSync(path.join(clone, ".claude"), { recursive: true, force: true });
  return buildLeve(
    path.join(tmp, "main-harness"),
    path.join(clone, "cli", "dist", "hx.js"),
    name === "leve-plugins",
  );
}

/** Opening cost: claude -p ok, 3 times in the profile, median of the usage fields. */
async function measureOpening() {
  const clone = fs.mkdtempSync(path.join(os.tmpdir(), "hx-bench-"));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hx-bench-plugin-"));
  env.HARNESS_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "hx-bench-home-"));
  try {
    must(`git clone -q --no-hardlinks "${root}" "${clone}"`);
    const extra = prepare(perfil, clone, tmp);
    const bin = process.env.HX_CLAUDE_BIN || "claude";
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const r = sh(`${bin} -p "ok" --output-format json --model sonnet ${extra}`, clone);
      let j;
      try {
        j = parseJson(r.out);
      } catch {
        throw new Error(`abertura ${i + 1}: sem json\n${r.out}`);
      }
      const u = j.usage ?? {};
      runs.push({
        input: u.input_tokens ?? 0,
        cache_read: u.cache_read_input_tokens ?? 0,
        cache_creation: u.cache_creation_input_tokens ?? 0,
        output: u.output_tokens ?? 0,
        cost_usd: j.total_cost_usd ?? 0,
      });
    }
    const med = Object.fromEntries(
      Object.keys(runs[0]).map((k) => [k, median(runs.map((x) => x[k]))]),
    );
    const file = path.join(outDir, `abertura-${perfil}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify({ perfil, model: "sonnet", runs, median: med }, null, 2) + "\n",
    );
    console.log(`Abertura gravada: ${file}`);
  } finally {
    for (const d of [clone, tmp, env.HARNESS_HOME])
      fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
if (abertura) {
  try {
    await measureOpening();
  } catch (e) {
    console.error(mask(e.message));
    process.exitCode = 1;
  }
  process.exit();
}

const base = must(`git rev-parse "${baseArg}^{commit}"`, root);
const clone = fs.mkdtempSync(path.join(os.tmpdir(), "hx-bench-"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hx-bench-plugin-"));
env.HARNESS_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "hx-bench-home-"));
try {
  must(`git clone -q --no-hardlinks "${root}" "${clone}"`);
  must(`git checkout -q ${base}`, clone);
  must("npm ci --no-audit --no-fund", clone); // before the clock starts

  const extra = prepare(perfil, clone, tmp);
  const before = await limits();
  const bin = process.env.HX_CLAUDE_BIN || "claude";
  const modelFlag = modelId; // opus/sonnet keep their own name
  const t0 = Date.now();
  const run = await new Promise((resolve) => {
    const c = spawn(
      `${bin} -p --output-format json --model ${modelFlag} --agent main-harness:executor --allowedTools ${TOOLS} ${extra}`,
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
    res = parseJson(run.out);
  } catch {
    // killed or crashed: no result json
  }
  // shortcut: counts "429" in stderr and the final text, not per API call; upgrade to stream-json if it matters
  const errors_429 = (
    `${run.err}\n${res.result ?? (res.type ? "" : run.out)}`.match(/\b429\b/g) ?? []
  ).length;

  if (perfil === "leve" || perfil === "leve-plugins")
    must("git checkout -q -- CLAUDE.md .claude", clone); // undo the lean swap
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
  const acceptance = tests(clone, ACCEPTANCE); // same command as the handoff
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
    perfil: perfil ?? null,
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
  const file = path.join(outDir, `${challenge}-${perfil ?? model}${rep > 1 ? `-r${rep}` : ""}`);
  fs.writeFileSync(`${file}.json`, mask(JSON.stringify(result, null, 2)) + "\n");
  fs.writeFileSync(`${file}.patch`, patch);
  console.log(`Corrida gravada: ${file}.json (${duration_s} s, saída ${run.code}).`);
} catch (e) {
  console.error(mask(e.message));
  process.exitCode = 1;
} finally {
  for (const d of [clone, tmp, env.HARNESS_HOME])
    fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
