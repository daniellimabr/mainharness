// B005: resume a chat after the usage limit (ADR 0011). The StopFailure hook schedules a
// one-time Windows task; at reset + 2 min it runs `hx resume <session> <dir>`.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadConfig } from "../core/config";
import { harnessHome } from "../core/paths";
import { runTool } from "../core/proc";
import { resolveProject } from "../core/projects";
import { emit } from "../events/emit";

export type Run = (cmd: string, args: string[], cwd?: string) => { ok: boolean; out: string };
const defaultRun: Run = (cmd, args, cwd) => runTool(cmd, args, cmd === "claude" ? 0 : 10_000, cwd);

const SESSION_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const taskName = (s: string) => `MainHarness-Resume-${s}`;
const pendingDir = () => path.join(harnessHome(), "resume");
const PROMPT = "Continue de onde parou.";

/** Session and folder come from hook input: only a UUID and an existing absolute plain path pass. */
function valid(session: string, dir: string): boolean {
  if (!SESSION_RE.test(session)) return false;
  if (!path.isAbsolute(dir) || /["%^&|<>!`$\r\n]/.test(dir)) return false;
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
const localStamp = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const xmlEsc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Creates (or replaces, same name per session) the task; false when input is refused or schtasks fails. */
export function scheduleResume(
  session: string,
  dir: string,
  resetsAt: string,
  deps: { run?: Run; now?: number } = {},
): boolean {
  const reset = Date.parse(resetsAt);
  if (!valid(session, dir) || isNaN(reset)) return false;
  const at = new Date(Math.max(reset, deps.now ?? Date.now()) + 120_000);
  const hx = path.join(loadConfig().stableDir, "cli", "dist", "hx.js");
  // XML instead of /sc once /sd: /sd follows the machine's date locale; XML takes ISO time.
  const xml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers><TimeTrigger><StartBoundary>${localStamp(at)}</StartBoundary></TimeTrigger></Triggers>
  <Settings>
    <StartWhenAvailable>true</StartWhenAvailable>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
  </Settings>
  <Actions><Exec>
    <Command>${xmlEsc(process.execPath)}</Command>
    <Arguments>${xmlEsc(`"${hx}" resume ${session} "${dir}"`)}</Arguments>
    <WorkingDirectory>${xmlEsc(dir)}</WorkingDirectory>
  </Exec></Actions>
</Task>
`;
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hx-resume-")), "task.xml");
  try {
    fs.writeFileSync(file, "﻿" + xml, "utf16le");
    const r = (deps.run ?? defaultRun)("schtasks", [
      "/create",
      "/tn",
      taskName(session),
      "/xml",
      file,
      "/f",
    ]);
    if (!r.ok) return false;
  } finally {
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  }
  fs.mkdirSync(pendingDir(), { recursive: true });
  const entry = { session, dir, at: at.toISOString() };
  fs.writeFileSync(path.join(pendingDir(), `${session}.json`), JSON.stringify(entry));
  return true;
}

/** Scheduled resumes not yet run (for hx doctor). */
export function pendingResumes(): { session: string; dir: string; at: string }[] {
  if (!fs.existsSync(pendingDir())) return [];
  return fs.readdirSync(pendingDir()).flatMap((f) => {
    try {
      return [JSON.parse(fs.readFileSync(path.join(pendingDir(), f), "utf8"))];
    } catch {
      return [];
    }
  });
}

/** hx resume <session> <dir>: run by the scheduled task. */
export function run(args: string[], deps: { run?: Run } = {}): number {
  const [session = "", dir = ""] = args;
  if (!valid(session, dir)) {
    console.error("uso: hx resume <sessão (UUID)> <pasta absoluta do projeto>");
    return 1;
  }
  const call = deps.run ?? defaultRun;
  const pending = path.join(pendingDir(), `${session}.json`);
  const at = () => {
    try {
      return (JSON.parse(fs.readFileSync(pending, "utf8")) as { at?: string }).at;
    } catch {
      return undefined;
    }
  };
  const before = at();
  const r = call("claude", ["--resume", session, "-p", PROMPT], dir);
  const project = resolveProject(dir)?.id;
  if (project) emit({ type: "session.resume", project, session, data: { ok: r.ok } });
  // A new limit hit during this run rescheduled the task: keep it.
  if (at() === before) {
    call("schtasks", ["/delete", "/tn", taskName(session), "/f"]);
    fs.rmSync(pending, { force: true });
  }
  return r.ok ? 0 : 1;
}
