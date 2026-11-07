// Notification, PermissionRequest, StopFailure, PostToolUseFailure: `attention` and `error` events (B107).
// Metadata only: never the message, the error text or the tool input.
import { resolveProject } from "../core/projects";
import { readState } from "../core/state";
import { showToast, type ToastFn } from "../core/toast";
import { emit } from "../events/emit";
import { ID_RE } from "../events/schema";
import { currentTask } from "./lifecycle";
import type { HookInput, HookOutcome } from "./runner";

const id = (v: unknown) => (typeof v === "string" && ID_RE.test(v) ? v : null);

function record(
  type: "attention" | "error",
  source: string,
  kind: unknown,
  input: HookInput,
): HookOutcome {
  const p = resolveProject(input.cwd || process.cwd());
  if (!p) return {};
  const st = readState(p.id);
  const agentId = id(input.agent_id);
  const agentTasks = (st as { agentTasks?: Record<string, string> }).agentTasks;
  emit({
    type,
    project: p.id,
    session: id(input.session_id),
    sprint: st.activeSprint,
    task: (agentId && agentTasks?.[agentId]) || currentTask(st),
    data: { source, kind: id(kind) ?? "unknown", agent_id: agentId },
  });
  return {};
}

export function notification(i: HookInput, toast: ToastFn = showToast): HookOutcome {
  toast("Main Harness", "O agente está esperando por você.");
  return record("attention", "notification", i.notification_type, i);
}
export function permissionRequest(i: HookInput, toast: ToastFn = showToast): HookOutcome {
  toast("Main Harness", "O agente pediu permissão.");
  return record("attention", "permission", i.tool_name, i);
}
export const stopFailure = (i: HookInput) => record("error", "stop", i.error, i);
export const postToolUseFailure = (i: HookInput) => record("error", "tool", i.tool_name, i);
