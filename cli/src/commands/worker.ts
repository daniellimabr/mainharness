// hx worker status|run: Gemini (OmniRoute) workers. Never writes ~/.claude/settings.json: Claude Code
// applies it live to every open chat, which sent Opus to OmniRoute and broke the S10 chat (ADR 0012).
// The OmniRoute env goes only to the detached child (`hx worker _child`), never into this process.
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig } from "../core/config";
import { commandContext } from "../core/context";
import { harnessHome } from "../core/paths";
import { emit } from "../events/emit";
import { loadPlan } from "../sprint/cmd";
import { run as task } from "./task";

const TIMEOUT_MS = 3000;
const WORKER_TIMEOUT_MS = 60 * 60_000;
const TOOLS = "Read,Edit,Write,Glob,Grep,Bash,PowerShell"; // without PowerShell the spike worker hung
const USAGE = "uso: hx worker status | hx worker run TNN <arquivo-handoff>";

interface Deps {
  fetch?: typeof fetch;
  timeoutMs?: number;
  spawn?: typeof spawn;
  /** Path of hx.js that the detached child runs. */
  hx?: string;
}

const dir = () => path.join(harnessHome(), "worker");
const lockFile = () => path.join(dir(), "lock.json");

async function omniUp(url: string, token: string, deps: Deps): Promise<boolean> {
  try {
    const res = await (deps.fetch ?? fetch)(`${url}/v1/models`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(deps.timeoutMs ?? TIMEOUT_MS),
      redirect: "error",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Token configured and OmniRoute up; prints why not. */
async function ready(deps: Deps): Promise<ReturnType<typeof loadConfig>["worker"] | null> {
  const w = loadConfig().worker;
  if (!w.token) {
    console.error("Trabalhador não configurado: falta worker.token em ~/.harness/config.json.");
    return null;
  }
  if (!(await omniUp(w.url, w.token, deps))) {
    console.error(`Trabalhador indisponível: OmniRoute fora do ar em ${w.url}.`);
    return null;
  }
  return w;
}

function alive(pid: unknown): boolean {
  if (typeof pid !== "number") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readLock(): { pid?: number; sprint?: string; task?: string } {
  try {
    return (JSON.parse(fs.readFileSync(lockFile(), "utf8")) as { pid?: number } | null) ?? {};
  } catch {
    return {};
  }
}

/** Creates the lock atomically (flag wx), holding this PID until the child's; a stale lock is replaced once. */
function takeLock(sprint: string, task: string): boolean {
  fs.mkdirSync(dir(), { recursive: true });
  for (let i = 0; i < 2; i++) {
    try {
      fs.writeFileSync(lockFile(), JSON.stringify({ pid: process.pid, sprint, task }), {
        flag: "wx",
      });
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    const lock = readLock();
    if (alive(lock.pid)) {
      console.error(`Já há um trabalhador rodando (${lock.sprint}/${lock.task}, PID ${lock.pid}).`);
      return false;
    }
    fs.rmSync(lockFile(), { force: true }); // dead PID, empty or invalid JSON
  }
  console.error("Outro hx worker run pegou o lock ao mesmo tempo.");
  return false;
}

async function start(id: string | undefined, file: string | undefined, deps: Deps) {
  if (!id || !/^T\d{2}$/i.test(id) || !file) {
    console.error(USAGE);
    return 1;
  }
  const ctx = commandContext(process.cwd());
  const sprint = ctx.sprint;
  const tnn = id.toUpperCase();
  if (!sprint || !loadPlan(ctx.root, sprint).plan.tasks.some((t) => t.id === tnn)) {
    console.error(`Tarefa ${tnn} não está na sprint ativa${sprint ? ` ${sprint}` : ""}.`);
    return 1;
  }
  const handoff = path.resolve(file);
  if (!fs.existsSync(handoff) || !fs.readFileSync(handoff, "utf8").trim()) {
    console.error(`Handoff não encontrado ou vazio: ${handoff}`);
    return 1;
  }
  if (!takeLock(sprint, tnn)) return 1;
  let w: Awaited<ReturnType<typeof ready>> = null;
  let child: ReturnType<typeof spawn> | undefined;
  try {
    w = await ready(deps);
    if (w)
      child = (deps.spawn ?? spawn)(
        process.execPath,
        [deps.hx ?? process.argv[1] ?? "", "worker", "_child", sprint, tnn, handoff],
        {
          cwd: ctx.root,
          detached: true, // own process group: survives the parent chat
          stdio: "ignore",
          windowsHide: true,
          env: {
            ...process.env,
            ANTHROPIC_BASE_URL: w.url,
            ANTHROPIC_AUTH_TOKEN: w.token,
            ANTHROPIC_API_KEY: "",
            ANTHROPIC_MODEL: w.model,
            ANTHROPIC_DEFAULT_OPUS_MODEL: w.model,
            ANTHROPIC_DEFAULT_SONNET_MODEL: w.model,
            ANTHROPIC_DEFAULT_HAIKU_MODEL: w.model,
            CLAUDE_CODE_SUBAGENT_MODEL: w.model,
          },
        },
      );
  } catch (e) {
    console.error(`Falha ao iniciar o trabalhador: ${(e as Error).message}`);
  }
  if (!w || !child) {
    fs.rmSync(lockFile(), { force: true }); // gave up: leave no lock behind
    return 1;
  }
  const m = w.model;
  child.unref();
  fs.writeFileSync(lockFile(), JSON.stringify({ pid: child.pid, sprint, task: tnn }));
  emit({
    project: ctx.id,
    session: ctx.session,
    sprint,
    task: tnn,
    agent: "gemini",
    type: "worker.start",
    data: { model: m },
  });
  console.log(
    `Trabalhador ${m} rodando ${sprint}/${tnn}; relatório em ${path.join(dir(), `${sprint}-${tnn}.md`)}.`,
  );
  return 0;
}

/** Detached child: runs claude -p with the handoff on stdin, writes the report, marks fila, frees the lock. */
async function child(sprint: string, tnn: string, handoff: string): Promise<number> {
  const t0 = Date.now();
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.CLAUDECODE; // a nested session must not think it runs inside the parent chat
  // Same launch as hx eval: fixed flags on the line, shell lets HX_CLAUDE_BIN / claude.cmd work on Windows.
  const bin = process.env.HX_CLAUDE_BIN || "claude";
  const r = await new Promise<{ code: number; out: string }>((resolve) => {
    // --model: the executor agent pins a full Claude id that the ANTHROPIC_DEFAULT_* aliases don't remap.
    const c = spawn(
      `${bin} -p --model ${process.env.ANTHROPIC_MODEL} --agent main-harness:executor --allowedTools ${TOOLS}`,
      {
        env,
        shell: true,
        windowsHide: true,
      },
    );
    let out = "";
    // A hung worker would hold the lock forever; spawn's timeout only kills the shell on Windows.
    const timer = setTimeout(() => {
      out += "\nTempo esgotado (60 min): trabalhador encerrado.";
      if (process.platform === "win32" && c.pid)
        spawnSync("taskkill", ["/T", "/F", "/PID", String(c.pid)]);
      else c.kill();
    }, WORKER_TIMEOUT_MS);
    c.on("close", () => clearTimeout(timer));
    c.stdin.on("error", () => {}); // shell gone before reading (claude not on PATH): still write the report
    c.stdout.setEncoding("utf8").on("data", (d: string) => (out += d));
    c.stderr.setEncoding("utf8").on("data", (d: string) => (out += d));
    c.on("error", (e) => resolve({ code: -1, out: `${out}\n${e.message}` }));
    c.on("close", (code) => resolve({ code: code ?? -1, out }));
    c.stdin.end(fs.readFileSync(handoff, "utf8"));
  });
  const token = process.env.ANTHROPIC_AUTH_TOKEN;
  const out = token ? r.out.split(token).join("***") : r.out;
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(
    path.join(dir(), `${sprint}-${tnn}.md`),
    `# Trabalhador ${sprint}/${tnn}\n\nModelo: ${process.env.ANTHROPIC_MODEL}. Código de saída: ${r.code}.\n\n${out}\n`,
  );
  const ctx = commandContext(process.cwd(), "gemini");
  try {
    task(["phase", tnn, "fila", "--agent", "gemini"]);
  } catch (e) {
    console.error(String(e)); // task no longer in progress: the report is what matters
  }
  emit({
    project: ctx.id,
    session: ctx.session,
    sprint,
    task: tnn,
    agent: "gemini",
    type: "worker.end",
    data: {
      model: process.env.ANTHROPIC_MODEL ?? "",
      exit_code: r.code,
      duration_s: Math.round((Date.now() - t0) / 1000),
    },
  });
  if (readLock().pid === process.pid) fs.rmSync(lockFile(), { force: true });
  return r.code === 0 ? 0 : 1;
}

export async function run(args: string[], deps: Deps = {}): Promise<number> {
  const [sub, a, b, c] = args;
  if (sub === "run") return start(a, b, deps);
  if (sub === "_child" && a && b && c) return child(a, b, c);
  if (sub !== "status") {
    console.error(USAGE);
    return 1;
  }
  const w = await ready(deps);
  if (!w) return 1;
  console.log(`Trabalhador pronto: OmniRoute em ${w.url}, modelo ${w.model}.`);
  return 0;
}
