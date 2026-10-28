// SessionStart: records the session, migrates the project if needed and injects a short context.
import * as fs from "node:fs";
import * as path from "node:path";
import { syncCompactWindow } from "../attach/setup";
import { migrateProject } from "../commands/migrate";
import { ensureConfig, loadConfig } from "../core/config";
import { logError } from "../core/log";
import { safeText } from "../core/text";
import { readProjects, resolveProject } from "../core/projects";
import { type ProjectState, readState, updateState } from "../core/state";
import { compareVersions, harnessVersion } from "../core/version";
import { emit } from "../events/emit";
import { summarizeIndex } from "../repomap/index";
import { renderTaskList } from "../sprint/index";
import { jsonOut, type HookInput, type HookOutcome } from "./runner";

const HANDOFF_MAX = 4000;

/** Backlog ids already shown to this project (kept in its state file). */
type Shown = ProjectState & { shownRequests?: string[] };

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

/** Chat title (only sent when set by /rename or --name), made safe for the event schema. */
function title(input: HookInput): { title?: string } {
  const t = input.session_title;
  if (typeof t !== "string") return {};
  const safe = safeText(t);
  return safe.trim() ? { title: safe } : {};
}

/** Owner project of an inbox file `AAAA-MM-DD-<project>-<slug>.md`: the longest known id that fits. */
function ownerOf(file: string, ids: string[]): string | undefined {
  return ids
    .filter(
      (id) => /^[a-z0-9-]+$/.test(id) && new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${id}-`).test(file),
    )
    .sort((a, b) => b.length - a.length)[0];
}

/**
 * The project's requests marked `feito (SNN)` in the harness backlog, shown once per id.
 * The backlog is external input: only plain, size-limited text comes out of it.
 */
function doneRequests(projectId: string, version: string): string {
  const file = path.join(loadConfig().harnessRepo, "docs", "backlog.md");
  if (!fs.existsSync(file)) return "";
  const ids = [...new Set([projectId, ...readProjects().map((e) => e.id)])];
  const shown = new Set((readState(projectId) as Shown).shownRequests ?? []);
  const lines: string[] = [];
  const ok: string[] = [];
  for (const row of fs.readFileSync(file, "utf8").split("\n")) {
    // `\|` is a pipe inside a cell, not a column break.
    const cells = row.split(/(?<!\\)\|/).map((c) => c.replaceAll("\\|", "|").trim());
    const [, id = "", item = "", origin = ""] = cells;
    const status = cells[cells.length - 2] ?? "";
    const inbox = /^inbox:\s*`?([\w.-]+\.md)/.exec(origin)?.[1];
    if (!/^B\d+$/.test(id) || !/^feito \(S\d+\)$/.test(status) || shown.has(id)) continue;
    if (!inbox || ownerOf(inbox, ids) !== projectId) continue;
    ok.push(id);
    const text = item.replace(/[\p{Cc}`]/gu, " ").slice(0, 160);
    lines.push(`- ${id} (${status}): ${text}`);
  }
  if (!ok.length) return "";
  updateState(projectId, (s) => {
    (s as Shown).shownRequests = [...shown, ...ok];
  });
  // Backlog is oldest first: keep the 10 newest so a first run with old history still shows this sprint's.
  return `Pedidos deste projeto atendidos no harness (versão ${version}):\n${lines.slice(-10).join("\n")}`;
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
  // Every chat, not only on version change: config.json may change without a release.
  try {
    syncCompactWindow(p.root, loadConfig().contextLimit);
  } catch (err) {
    logError("hook session-start compact window", err);
  }
  emit({
    type: "session.start",
    project: p.id,
    session,
    sprint: state.activeSprint,
    data: { source, model: typeof input.model === "string" ? input.model : null, ...title(input) },
  });

  try {
    const done = doneRequests(p.id, version);
    if (done) parts.push(done);
  } catch (err) {
    logError("hook session-start requests", err);
  }

  // Requests the harness sent to this project (the harness repo has its own inbox notice).
  try {
    // Windows paths are case-insensitive (VS Code passes c:\ while config has C:\).
    const norm = (s: string) => path.resolve(s).toLowerCase();
    if (norm(p.root) !== norm(loadConfig().harnessRepo)) {
      const dir = path.join(p.root, "inbox");
      const n = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")).length
        : 0;
      if (n) parts.push(`Pedidos do harness no inbox/: ${n}. Leia antes de planejar.`);
    }
  } catch (err) {
    logError("hook session-start inbox", err);
  }

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
