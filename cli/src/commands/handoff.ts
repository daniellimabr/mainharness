// hx handoff [--show|--consume]: saves the agent's handoff (stdin) under ~/.harness/handoffs/<project>.
import * as fs from "node:fs";
import * as path from "node:path";
import { flagStr, parseArgs } from "../core/args";
import { commandContext } from "../core/context";
import { home } from "../core/paths";
import { readState, updateState } from "../core/state";
import { emit, utcStamp } from "../events/emit";
import { createNew } from "../sprint/cmd";

const EMPTY = "handoff vazio: envie o texto pela entrada padrão (ex.: hx handoff <<'EOF' ... EOF)";

export function run(args: string[]): number {
  const p = parseArgs(args);
  const ctx = commandContext(process.cwd(), flagStr(p, "agent"));
  const last = readState(ctx.id).lastHandoff;

  if (p.flags.show !== undefined || p.flags.consume !== undefined) {
    if (!last || !fs.existsSync(last.file)) {
      console.log("Nenhum handoff registrado neste projeto.");
      return 0;
    }
    if (p.flags.consume !== undefined) {
      updateState(ctx.id, (s) => {
        if (s.lastHandoff) s.lastHandoff.consumed = true;
      });
      console.log(`Handoff marcado como consumido: ${last.file}`);
    } else console.log(fs.readFileSync(last.file, "utf8"));
    return 0;
  }

  if (process.stdin.isTTY) throw new Error(EMPTY);
  let body = "";
  try {
    body = fs.readFileSync(0, "utf8").trim();
  } catch {
    // no stdin
  }
  if (!body) throw new Error(EMPTY);

  const at = utcStamp();
  const dir = home.handoffs(ctx.id);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = at.slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
  const header = [
    `# Handoff — ${ctx.harness.name || ctx.id}`,
    "",
    `- **Projeto:** ${ctx.id}`,
    `- **Sprint:** ${ctx.sprint ?? "—"}`,
    `- **Sessão:** ${ctx.session ?? "—"}`,
    `- **Data (UTC):** ${at}`,
    "",
  ].join("\n");
  const file = createNew(dir, stamp, `${header}\n${body}\n`);
  updateState(ctx.id, (s) => {
    s.lastHandoff = { file, at, consumed: false };
  });
  emit({
    type: "handoff",
    project: ctx.id,
    session: ctx.session,
    sprint: ctx.sprint,
    agent: ctx.agent,
    ts: at,
    data: { mode: "manual", file: path.basename(file) },
  });
  console.log(`Handoff gravado: ${file}`);
  return 0;
}
