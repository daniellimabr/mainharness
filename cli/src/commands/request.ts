// hx request: writes a NEW request file into the harness inbox (never edits an existing one).
import * as fs from "node:fs";
import * as path from "node:path";
import { flagStr, parseArgs } from "../core/args";
import { loadConfig } from "../core/config";
import { commandContext } from "../core/context";
import { pluginRoot } from "../core/paths";
import { slugify } from "../core/projects";
import { emit, utcStamp } from "../events/emit";
import { createNew } from "../sprint/cmd";

const PRIORITIES = ["alta", "media", "baixa"] as const;
type Priority = (typeof PRIORITIES)[number];

export function run(args: string[]): number {
  const p = parseArgs(args);
  const title = flagStr(p, "title");
  const need = flagStr(p, "need");
  const why = flagStr(p, "why");
  if (!title || !need || !why) {
    console.error(
      'uso: hx request --title "..." --need "..." --why "..." [--priority alta|media|baixa] [--example "..."]',
    );
    return 1;
  }
  const raw = (flagStr(p, "priority") ?? "media").normalize("NFD").replace(/\p{M}/gu, "");
  if (!PRIORITIES.includes(raw as Priority))
    throw new Error("prioridade deve ser alta, media ou baixa");
  const priority = raw as Priority;
  const ctx = commandContext(process.cwd(), flagStr(p, "agent"));

  const date = utcStamp().slice(0, 10);
  const values: Record<string, string> = {
    title,
    project: ctx.id,
    date,
    sprint: ctx.sprint ?? "—",
    need,
    why,
    priority,
    example: flagStr(p, "example") ?? "—",
  };
  const template = fs.readFileSync(
    path.join(pluginRoot(), "templates", "inbox-request.md"),
    "utf8",
  );
  const content = template.replace(/\{\{(\w+)\}\}/g, (m, k: string) => values[k] ?? m);

  const dir = loadConfig().inboxDir;
  fs.mkdirSync(dir, { recursive: true });
  const stem = `${date}-${ctx.id}-${slugify(title).slice(0, 60).replace(/-+$/, "")}`;
  const file = createNew(dir, stem, content);
  emit({
    type: "harness.request",
    project: ctx.id,
    session: ctx.session,
    sprint: ctx.sprint,
    agent: ctx.agent,
    data: { file: path.basename(file), priority },
  });
  console.log(`Pedido criado: ${file}`);
  return 0;
}
