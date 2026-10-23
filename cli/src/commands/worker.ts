// hx worker status: Gemini (OmniRoute) workers. Never writes ~/.claude/settings.json: Claude Code
// applies it live to every open chat, which sent Opus to OmniRoute and broke the S10 chat (ADR 0012).
import { loadConfig } from "../core/config";

const TIMEOUT_MS = 3000;

interface Deps {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

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

export async function run(args: string[], deps: Deps = {}): Promise<number> {
  if (args[0] !== "status") {
    console.error("uso: hx worker status");
    return 1;
  }
  const w = loadConfig().worker;
  if (!w.token) {
    console.error("Trabalhador não configurado: falta worker.token em ~/.harness/config.json.");
    return 1;
  }
  if (!(await omniUp(w.url, w.token, deps))) {
    console.error(`Trabalhador indisponível: OmniRoute fora do ar em ${w.url}.`);
    return 1;
  }
  console.log(`Trabalhador pronto: OmniRoute em ${w.url}, modelo ${w.model}.`);
  return 0;
}
