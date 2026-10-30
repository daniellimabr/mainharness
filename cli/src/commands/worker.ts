// hx worker check|run: external models that speak the Anthropic format (OmniRoute or direct), by alias
// from ~/.harness/config.json `workers`. Never writes ~/.claude/settings.json: Claude Code applies it
// live to every open chat (ADR 0012). The alias env goes only to the `claude` child process.
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { flagStr, parseArgs } from "../core/args";
import { loadConfig, type Worker } from "../core/config";
import { commandContext } from "../core/context";
import { parseStream } from "../eval/run";
import { emit } from "../events/emit";
import { ulid } from "../events/ulid";

const CHECK_TIMEOUT_MS = 20_000;
const RUN_TIMEOUT_MS = 60 * 60_000;
const TOOLS = "Read,Edit,Write,Glob,Grep,Bash,PowerShell"; // without PowerShell the S10 worker hung
const MODEL_RE = /^[A-Za-z0-9._:/@-]{1,128}$/; // goes on a shell command line
const USAGE =
  "uso: hx worker check <apelido> | hx worker run TNN <arquivo-handoff> --model <apelido>";

interface Deps {
  timeoutMs?: number;
  cwd?: string;
}

/** Alias from config, validated (the model goes on a shell line, the url gets the token). */
function worker(alias: string | undefined): Worker | null {
  const all = loadConfig().workers ?? {};
  const w = alias && Object.hasOwn(all, alias) ? all[alias] : undefined;
  if (!w) {
    const known = Object.keys(all).join(", ") || "nenhum";
    console.error(`Apelido desconhecido: ${alias ?? ""}. Configurados em workers: ${known}.`);
    return null;
  }
  if (
    typeof w.url !== "string" ||
    !/^https?:\/\//.test(w.url) ||
    typeof w.token !== "string" ||
    !w.token ||
    typeof w.model !== "string" ||
    !MODEL_RE.test(w.model)
  ) {
    console.error(
      `Trabalhador ${alias} mal configurado: precisa de url (http/https), model e token.`,
    );
    return null;
  }
  return w;
}

/** One tiny real /v1/messages call; "pronto" only when the model answers. */
async function check(alias: string | undefined, deps: Deps): Promise<number> {
  const w = worker(alias);
  if (!w) return 1;
  const where = `${w.url.replace(/\/+$/, "")}/v1/messages`;
  try {
    const res = await fetch(where, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": w.token,
        authorization: `Bearer ${w.token}`,
      },
      body: JSON.stringify({
        model: w.model,
        max_tokens: 16,
        messages: [{ role: "user", content: "Responda só: ok" }],
      }),
      signal: AbortSignal.timeout(deps.timeoutMs ?? CHECK_TIMEOUT_MS),
      redirect: "error",
    });
    if (res.status === 401 || res.status === 403) {
      console.error(`Trabalhador ${alias}: chave recusada (HTTP ${res.status}) em ${where}.`);
      return 1;
    }
    if (!res.ok) {
      console.error(`Trabalhador ${alias}: erro HTTP ${res.status} em ${where}.`);
      return 1;
    }
    const body = (await res.json()) as { content?: unknown };
    if (!Array.isArray(body.content)) {
      console.error(`Trabalhador ${alias}: resposta sem conteúdo em ${where}.`);
      return 1;
    }
  } catch (e) {
    console.error(`Trabalhador ${alias}: ${where} não respondeu (${(e as Error).message}).`);
    return 1;
  }
  console.log(`Trabalhador ${alias} pronto: ${w.model} respondeu em ${where}.`);
  return 0;
}

/** Runs the handoff in `claude -p` (executor agent) on the alias model; logs agent.start, usage, agent.end. */
async function start(args: string[], deps: Deps): Promise<number> {
  const p = parseArgs(args);
  const [tnn, handoff] = p._;
  if (!tnn || !/^T\d{2,3}$/.test(tnn) || !handoff) {
    console.error(USAGE);
    return 1;
  }
  if (!fs.existsSync(handoff) || !fs.readFileSync(handoff, "utf8").trim()) {
    console.error(`Handoff não encontrado ou vazio: ${handoff}`);
    return 1;
  }
  const alias = flagStr(p, "model");
  const w = worker(alias);
  if (!w) return 1;
  const ctx = commandContext(deps.cwd, "worker");
  const agentId = `worker-${ulid()}`;
  const ev = {
    project: ctx.id,
    session: ctx.session,
    sprint: ctx.sprint,
    task: tnn,
    agent: "worker",
  };
  emit({
    ...ev,
    type: "agent.start",
    data: { agent_id: agentId, agent_type: "worker", model: w.model },
  });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ANTHROPIC_BASE_URL: w.url,
    ANTHROPIC_AUTH_TOKEN: w.token,
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_MODEL: w.model,
    ANTHROPIC_DEFAULT_OPUS_MODEL: w.model,
    ANTHROPIC_DEFAULT_SONNET_MODEL: w.model,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: w.model,
    CLAUDE_CODE_SUBAGENT_MODEL: w.model,
    HARNESS_AGENT: "worker",
  };
  delete env.CLAUDECODE; // a nested session must not think it runs inside the parent chat
  // Same launch as hx eval: fixed flags on the line, shell lets HX_CLAUDE_BIN / claude.cmd work on Windows.
  // --model: the executor agent pins a full Claude id that the ANTHROPIC_DEFAULT_* aliases don't remap.
  const bin = process.env.HX_CLAUDE_BIN || "claude";
  const cmd = `${bin} -p --model ${w.model} --agent main-harness:executor --output-format stream-json --verbose --allowedTools ${TOOLS}`;
  const r = await new Promise<{ code: number; out: string; err: string }>((resolve) => {
    const c = spawn(cmd, { cwd: ctx.root, env, shell: true, windowsHide: true });
    let out = "";
    let err = "";
    // spawn's own timeout only kills the shell on Windows; take down the whole tree.
    const timer = setTimeout(() => {
      err += "\nTempo esgotado (60 min): trabalhador encerrado.";
      if (process.platform === "win32" && c.pid)
        spawnSync("taskkill", ["/T", "/F", "/PID", String(c.pid)]);
      else c.kill();
    }, RUN_TIMEOUT_MS);
    c.stdin.on("error", () => {}); // shell gone before reading (claude not on PATH)
    c.stdout.setEncoding("utf8").on("data", (d: string) => (out += d));
    c.stderr.setEncoding("utf8").on("data", (d: string) => (err += d));
    c.on("error", (e) => resolve({ code: -1, out, err: `${err}\n${e.message}` }));
    c.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, out, err });
    });
    c.stdin.end(fs.readFileSync(handoff, "utf8"));
  });

  const s = parseStream(r.out);
  for (const [i, u] of s.usage.entries()) {
    const pr = w.price;
    // cache tokens billed at the input price: conservative when the provider has no cache price
    const usd = pr
      ? Number(
          (
            ((u.input + u.cache_write + u.cache_read) * pr.input + u.output * pr.output) /
            1e6
          ).toFixed(6),
        )
      : null;
    emit({
      ...ev,
      type: "usage",
      data: {
        ...u,
        model: w.model,
        usd,
        message_id: `${agentId}:${i}`,
        transcript: "subagent",
        agent_id: agentId,
      },
    });
  }
  emit({ ...ev, type: "agent.end", data: { agent_id: agentId } });

  const mask = (t: string) => t.split(w.token).join("***");
  if (s.text) console.log(mask(s.text));
  if (r.code !== 0)
    console.error(mask(`claude -p saiu com código ${r.code}. ${r.err.trim().slice(-500)}`));
  return r.code === 0 ? 0 : 1;
}

export async function run(args: string[], deps: Deps = {}): Promise<number> {
  const [sub, ...rest] = args;
  if (sub === "check") return check(rest[0], deps);
  if (sub === "run") return start(rest, deps);
  console.error(USAGE);
  return 1;
}
