// hx usage: ingests the project's Claude Code transcripts and prints tokens and US$ per agent/model.
import * as fs from "node:fs";
import * as path from "node:path";
import { flagStr, parseArgs } from "../core/args";
import { commandContext } from "../core/context";
import { readEvents } from "../events/emit";
import type { HarnessEvent } from "../events/schema";
import { transcriptDirFor, transcriptSource } from "../usage";

interface Totals {
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
  usd: number;
}

const zero = (): Totals => ({ input: 0, output: 0, cache_write: 0, cache_read: 0, usd: 0 });
const fmt = (n: number) => n.toLocaleString("pt-BR");

function add(t: Totals, d: Record<string, unknown>): void {
  t.input += Number(d.input) || 0;
  t.output += Number(d.output) || 0;
  t.cache_write += Number(d.cache_write) || 0;
  t.cache_read += Number(d.cache_read) || 0;
  t.usd += Number(d.usd) || 0;
}

const line = (t: Totals) =>
  `entrada ${fmt(t.input)} · saída ${fmt(t.output)} · cache escrito ${fmt(t.cache_write)} · ` +
  `cache lido ${fmt(t.cache_read)} · US$ ${t.usd.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function summary(title: string, evs: HarnessEvent[]): string[] {
  const total = zero();
  const by = { agente: new Map<string, Totals>(), modelo: new Map<string, Totals>() };
  for (const e of evs) {
    add(total, e.data);
    for (const [map, k] of [
      [by.agente, e.agent ?? "?"],
      [by.modelo, String(e.data.model)],
    ] as const) {
      if (!map.has(k)) map.set(k, zero());
      add(map.get(k) as Totals, e.data);
    }
  }
  const out = [`${title} (${evs.length} respostas): ${line(total)}`];
  if (!evs.length) return out;
  for (const [label, map] of Object.entries(by)) {
    out.push(`  por ${label}:`);
    for (const [k, t] of map) out.push(`    ${k}: ${line(t)}`);
  }
  return out;
}

export function run(args: string[]): number {
  const p = parseArgs(args);
  let ctx;
  try {
    ctx = commandContext();
  } catch (err) {
    console.error((err as Error).message);
    return 1;
  }
  const dir = transcriptDirFor(ctx.root);
  if (!dir) {
    console.log("Nenhum transcript do Claude Code encontrado para este projeto.");
    return 0;
  }
  const only = flagStr(p, "session");
  const sessions = only
    ? [only]
    : fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => f.slice(0, -6));
  const fresh: HarnessEvent[] = [];
  for (const id of sessions) {
    const transcriptPath = path.join(dir, `${id}.jsonl`);
    if (!fs.existsSync(transcriptPath)) {
      console.error(`Sessão não encontrada: ${id}`);
      return 1;
    }
    fresh.push(
      ...transcriptSource.ingest({
        transcriptPath,
        sessionId: id,
        project: ctx.id,
        sprint: ctx.sprint,
      }),
    );
  }
  const all = readEvents((e) => e.type === "usage" && e.project === ctx.id);
  console.log(
    [
      `Consumo de ${ctx.id} (US$ estimado):`,
      ...summary("Novo nesta leitura", fresh),
      ...summary("Acumulado", all),
    ].join("\n"),
  );
  return 0;
}
