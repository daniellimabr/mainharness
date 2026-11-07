// B109: Windows toast when the agent needs Daniel. Silent on failure; no-op elsewhere.
import { spawn } from "node:child_process";

export type ToastFn = (title: string, body: string) => void;

const PS = (t: string, b: string) =>
  `$null=[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime];` +
  `$x=[Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent('ToastText02');` +
  `$n=$x.GetElementsByTagName('text');$n[0].AppendChild($x.CreateTextNode('${t}'))|Out-Null;` +
  `$n[1].AppendChild($x.CreateTextNode('${b}'))|Out-Null;` +
  `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Main Harness').Show([Windows.UI.Notifications.ToastNotification]::new($x))`;

/** Titles and bodies are fixed strings from the hooks, never user text (no quoting needed). */
export const showToast: ToastFn = (title, body) => {
  if (process.platform !== "win32" || process.env.VITEST) return; // no real toasts from the test suite
  try {
    spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", PS(title, body)], {
      stdio: "ignore",
      windowsHide: true,
    }).on("error", () => {});
  } catch {
    // silent by design
  }
};
