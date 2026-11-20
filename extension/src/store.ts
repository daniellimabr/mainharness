// Reads the dashboard state files written by hx (docs/contracts/state.md). No vscode import: the UI wiring lives elsewhere.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { State } from "./types";

export interface ProjectInfo {
  id: string;
  name: string;
  path?: string;
}

export type StateResult =
  | { kind: "ok"; state: State }
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "newer"; v: number };

const KNOWN_V = 1;

export const defaultHome = (): string =>
  process.env.HARNESS_HOME ?? path.join(os.homedir(), ".harness");

function readJsonFile(file: string): unknown {
  try {
    const s = fs.readFileSync(file, "utf8");
    return JSON.parse(s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
  } catch {
    return undefined;
  }
}

export function readProjects(home: string = defaultHome()): ProjectInfo[] {
  const j = readJsonFile(path.join(home, "projects.json")) as { projects?: unknown } | undefined;
  if (!Array.isArray(j?.projects)) return [];
  return j.projects.flatMap((p: { id?: unknown; name?: unknown; path?: unknown }) =>
    p && typeof p.id === "string"
      ? [
          {
            id: p.id,
            name: typeof p.name === "string" ? p.name : p.id,
            ...(typeof p.path === "string" ? { path: p.path } : {}),
          },
        ]
      : [],
  );
}

export function readState(home: string, id: string): StateResult {
  if (!id || id !== path.basename(id)) return { kind: "invalid" };
  const file = path.join(home, "dashboard", `${id}.json`);
  if (!fs.existsSync(file)) return { kind: "missing" };
  const j = readJsonFile(file) as { v?: unknown } | undefined;
  if (!j || typeof j !== "object" || typeof j.v !== "number") return { kind: "invalid" };
  if (j.v > KNOWN_V) return { kind: "newer", v: j.v };
  return { kind: "ok", state: j as unknown as State };
}

/** Calls onChange once per burst of changes in <home>/dashboard. If the folder is missing, retries every retryMs. */
export function watchDashboard(
  home: string,
  onChange: () => void,
  debounceMs = 300,
  retryMs = 5000,
): () => void {
  const dir = path.join(home, "dashboard");
  let watcher: fs.FSWatcher | undefined;
  let timer: NodeJS.Timeout | undefined;
  let retry: NodeJS.Timeout | undefined;
  let disposed = false;

  const fire = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!disposed) onChange();
    }, debounceMs);
  };

  const attach = (): boolean => {
    try {
      watcher = fs.watch(dir, fire);
      watcher.on("error", () => {
        watcher?.close();
        watcher = undefined;
        startRetry();
      });
      return true;
    } catch {
      return false;
    }
  };

  const startRetry = (): void => {
    retry = setInterval(() => {
      if (!attach()) return;
      clearInterval(retry);
      fire(); // the folder appeared: state may already be there
    }, retryMs);
  };

  if (!attach()) startRetry();

  return () => {
    disposed = true;
    clearTimeout(timer);
    clearInterval(retry);
    watcher?.close();
  };
}
