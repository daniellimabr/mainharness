// Test helpers: temp folders WITH SPACES, isolated HARNESS_HOME, running the built hx.js.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const HX = path.join(REPO_ROOT, "cli", "dist", "hx.js");

/** Creates a temp dir whose name contains spaces. */
export function tempDir(label = "hx test"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${label} `));
}

export function rm(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Points HARNESS_HOME at a fresh temp dir for in-process tests. Returns cleanup. */
export function isolateHome(): { home: string; cleanup: () => void } {
  const home = tempDir("hx home");
  const prev = process.env.HARNESS_HOME;
  process.env.HARNESS_HOME = home;
  return {
    home,
    cleanup: () => {
      if (prev === undefined) delete process.env.HARNESS_HOME;
      else process.env.HARNESS_HOME = prev;
      rm(home);
    },
  };
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs the bundled hx.js like Claude Code does (exec form: node + args). */
export function runHx(
  args: string[],
  opts: { cwd?: string; stdin?: unknown; env?: Record<string, string> } = {},
): RunResult {
  const input =
    opts.stdin === undefined
      ? ""
      : typeof opts.stdin === "string"
        ? opts.stdin
        : JSON.stringify(opts.stdin);
  const r = spawnSync(process.execPath, [HX, ...args], {
    cwd: opts.cwd ?? REPO_ROOT,
    input,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: REPO_ROOT, HARNESS_NO_OPEN: "1", ...opts.env },
  });
  return { code: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

export function readEventsIn(home: string): Record<string, unknown>[] {
  const dir = path.join(home, "events");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .flatMap((f) => fs.readFileSync(path.join(dir, f), "utf8").split("\n"))
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

/** Creates an attached project folder (with spaces) for tests. */
export function fakeProject(id = "proj-teste", name = "Proj Teste"): string {
  const dir = tempDir("hx proj");
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude", "harness.json"),
    JSON.stringify({
      project: id,
      name,
      version: "0.1.0",
      attachedAt: "2026-10-15T00:00:00Z",
      web: false,
      optionalSkills: [],
    }),
  );
  return dir;
}
