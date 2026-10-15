// Error log for hooks and commands: ~/.harness/logs/hx-YYYY-MM-DD.log. Never throws.
import * as fs from "node:fs";
import * as path from "node:path";
import { home } from "./paths";

export function logError(scope: string, err: unknown): void {
  try {
    const dir = home.logs();
    fs.mkdirSync(dir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
    fs.appendFileSync(
      path.join(dir, `hx-${day}.log`),
      `${new Date().toISOString()} [${scope}] ${msg}\n`,
    );
  } catch {
    // logging must never break the session
  }
}
