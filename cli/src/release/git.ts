// Thin git wrapper (array args, so paths with spaces are safe).
import { spawnSync } from "node:child_process";

/** Raw run, for callers that need the exit status. No timeout unless given (hooks can be slow). */
export const gitRun = (cwd: string, args: string[], timeout?: number) =>
  spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true, timeout });

export const isGitRepo = (cwd: string) =>
  gitRun(cwd, ["rev-parse", "--is-inside-work-tree"]).stdout?.trim() === "true";

export function git(cwd: string, args: string[], allowFail = false): string {
  const r = gitRun(cwd, args);
  if (r.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(" ")}: ${(r.stderr || r.stdout || "").trim()}`);
  }
  return (r.stdout ?? "").trim();
}

/** Tags vX.Y.Z sorted ascending by semver. */
export function versionTags(cwd: string): string[] {
  return git(cwd, ["tag", "--list", "v*"], true)
    .split("\n")
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t))
    .sort((a, b) => {
      const pa = a.slice(1).split(".").map(Number);
      const pb = b.slice(1).split(".").map(Number);
      for (let i = 0; i < 3; i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d) return d;
      }
      return 0;
    });
}
