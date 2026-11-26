// hx: single CLI of the Main Harness. Each command lives in its own module.
import { logError } from "./core/log";

type Run = (args: string[]) => Promise<number> | number;

const COMMANDS: Record<string, () => Promise<{ run: Run }>> = {
  hook: () => import("./hooks/index"),
  task: () => import("./commands/task"),
  sprint: () => import("./commands/sprint"),
  review: () => import("./commands/review"),
  shot: () => import("./commands/shot"),
  handoff: () => import("./commands/handoff"),
  run: () => import("./commands/run"),
  worker: () => import("./commands/worker"),
  request: () => import("./commands/request"),
  metrics: () => import("./commands/metrics"),
  usage: () => import("./commands/usage"),
  attach: () => import("./commands/attach"),
  migrate: () => import("./commands/migrate"),
  skills: () => import("./commands/skills"),
  eval: () => import("./commands/eval"),
  doctor: () => import("./commands/doctor"),
  setup: () => import("./commands/setup"),
  release: () => import("./commands/release"),
  rollback: () => import("./commands/rollback"),
  version: async () => ({
    run: async () => {
      const { harnessVersion } = await import("./core/version");
      console.log(harnessVersion());
      return 0;
    },
  }),
};

const HELP = `hx <command> [args]

  hook <name>                 hooks do Claude Code (stdin JSON)
  task start|done <id>        marca tarefa do sprint ativo
  task phase <id> <fase>      fase da tarefa em andamento (testes, código, lint, fila, revisão, commit)
  sprint open|close|approve|feedback|status <id>
  review pass|fail <task>     resultado da revisão
  shot <url|arquivo> [--out f.png] [--width N] [--theme light|dark|both]
  handoff [--show|--consume]  grava (stdin)/mostra o handoff
  run <cmd...>                roda e mostra só falhas e resumo
  worker check <apelido>      confere o modelo externo com uma chamada de verdade
  worker run <TNN> <handoff> --model <apelido>   roda o handoff num modelo externo
  request --title t ...       cria pedido no inbox do harness
  metrics [sprint]            indicadores da sprint
  usage [--session id]        consumo a partir dos transcripts
  attach [dir]                conecta um repo ao harness
  migrate                     aplica migrações do harness no projeto
  skills on|off <nome>        liga/desliga skill opcional
  eval <skill>|--changed      roda os evals da skill (Sonnet) e grava results.json
  doctor                      confere o ambiente
  setup                       instalação da máquina (uma vez)
  release patch|minor|major   publica versão do harness
  rollback                    volta a versão estável anterior
  version                     versão do harness`;

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(HELP);
    return 0;
  }
  const load = COMMANDS[cmd];
  if (!load) {
    console.error(`hx: comando desconhecido: ${cmd}\n\n${HELP}`);
    return 1;
  }
  const mod = await load();
  return mod.run(rest);
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: unknown) => {
    logError(`hx ${process.argv.slice(2, 4).join(" ")}`, err);
    console.error(`hx: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  },
);
