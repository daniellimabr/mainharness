// Shared hook plumbing: stdin JSON in, exit code + stdout/stderr out. Errors never break the session.
import * as fs from "node:fs";
import { logError } from "../core/log";

export interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  agent_id?: string;
  agent_type?: string;
  agent_transcript_path?: string;
  source?: string;
  model?: string;
  reason?: string;
  trigger?: string;
  stop_hook_active?: boolean;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
  [k: string]: unknown;
}

export interface HookOutcome {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

export type HookHandler = (input: HookInput) => Promise<HookOutcome> | HookOutcome;

export function readStdin(): string {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

export function parseInput(raw: string): HookInput {
  if (!raw.trim()) return {};
  return JSON.parse(raw) as HookInput;
}

/**
 * Runs a handler with the rule "hooks never break the session": any thrown error is logged
 * and turned into exit 0. Only an explicit exitCode (2 = block / feedback) is honored.
 */
export async function runHook(name: string, handler: HookHandler, raw?: string): Promise<number> {
  try {
    raw ??= readStdin();
    const out = await handler(parseInput(raw));
    if (out.stdout) process.stdout.write(out.stdout);
    if (out.stderr) process.stderr.write(out.stderr);
    return out.exitCode ?? 0;
  } catch (err) {
    logError(`hook ${name}`, err);
    return 0;
  }
}

/** JSON output helper for hookSpecificOutput. */
export function jsonOut(obj: Record<string, unknown>): HookOutcome {
  return { stdout: JSON.stringify(obj) };
}
