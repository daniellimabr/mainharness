// Notification and PermissionRequest: toast Daniel (B109). The message is fixed, never the hook input.
import { showToast, type ToastFn } from "../core/toast";
import type { HookInput, HookOutcome } from "./runner";

export function notification(_input: HookInput, toast: ToastFn = showToast): HookOutcome {
  toast("Main Harness", "O agente está esperando por você.");
  return {};
}
export function permissionRequest(_input: HookInput, toast: ToastFn = showToast): HookOutcome {
  toast("Main Harness", "O agente pediu permissão.");
  return {};
}
