// SessionStart: records the session, migrates the project if needed and injects a short context.
import * as fs from "node:fs";
import { migrateProject } from "../commands/migrate";
import { ensureConfig } from "../core/config";
import { logError } from "../core/log";
import { resolveProject } from "../core/projects";
import { updateState } from "../core/state";
import { compareVersions, harnessVersion } from "../core/version";
import { emit } from "../events/emit";
import { summarizeIndex } from "../repomap/index";
import { renderTaskList } from "../sprint/index";
import { jsonOut, type HookInput, type HookOutcome } from "./runner";

const HANDOFF_MAX = 4000;

function migrationNote(root: string, from: string, to: string): string {
  if (compareVersions(to, from) === 0) return "";
  try {
    const r = migrateProject(root);
    const pending = r.pending ? ` Pendente (estrutural): ${r.pending}.` : "";
    return `Migração do harness: ${r.from} → ${r.to} (${r.applied.length} aplicadas).${pending}`;
  } catch (err) {
    logError("hook session-start migrate", err);
    return `Migração do harness ${from} → ${to} falhou; rode hx migrate.`;
  }
}

export function sessionStart(input: HookInput): HookOutcome {
  const p = resolveProject(input.cwd || process.cwd());
  if (!p) return {};
  ensureConfig();
  const source = input.source || "startup";
  const session = input.session_id || null;
  const state = updateState(p.id, (s) => {
    s.session = session;
  });
  const version = harnessVersion();
  const parts = [`Main Harness ${version} — projeto ${p.harness.name || p.id} (${p.id}).`];
  const migration = migrationNote(p.root, p.harness.version, version);
  if (migration) parts.push(migration);
  emit({
    type: "session.start",
    project: p.id,
    session,
    sprint: state.activeSprint,
    data: { source, model: typeof input.model === "string" ? input.model : null },
  });

  const index = summarizeIndex(p.root);
  if (index) parts.push(index);
  if (state.activeSprint) {
    try {
      const tasks = renderTaskList(p.root, state.activeSprint);
      parts.push(tasks || `Sprint ativa: ${state.activeSprint}.`);
    } catch (err) {
      logError("hook session-start tasks", err);
    }
  }

  const lh = state.lastHandoff;
  if (lh && !lh.consumed && (source === "compact" || source === "startup")) {
    try {
      let text = fs.readFileSync(lh.file, "utf8");
      if (text.length > HANDOFF_MAX) text = `${text.slice(0, HANDOFF_MAX)}\n[...]`;
      parts.push(`Último handoff:\n${text.trim()}\n\nContinue a sprint a partir deste handoff.`);
      if (source === "compact")
        updateState(p.id, (s) => {
          if (s.lastHandoff) s.lastHandoff.consumed = true;
        });
    } catch (err) {
      logError("hook session-start handoff", err);
    }
  }

  return jsonOut({
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: parts.join("\n\n") },
  });
}
