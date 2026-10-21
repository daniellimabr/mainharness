// Runs external tools without a shell string: PATH lookup (PATHEXT on Windows), .cmd shims quoted.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/** Finds an executable on PATH (Windows: tries PATHEXT). `claude` honors HARNESS_CLAUDE_BIN. */
export function which(cmd: string): string | null {
  if (cmd === "claude" && process.env.HARNESS_CLAUDE_BIN) return process.env.HARNESS_CLAUDE_BIN;
  const win = process.platform === "win32";
  const exts = win ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";") : [""];
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const f = path.join(dir, cmd + ext.toLowerCase());
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
    }
  }
  return null;
}

/** Runs a tool; .js runs on node, .cmd/.bat go through cmd.exe with quoted args. */
export function runTool(
  cmd: string,
  args: string[],
  timeout = 5000,
  cwd?: string,
): { ok: boolean; out: string } {
  const bin = which(cmd);
  if (!bin) return { ok: false, out: "" };
  // maxBuffer: a long `claude -p` (hx resume) prints more than the 1 MB default.
  const o = { cwd, encoding: "utf8" as const, timeout, windowsHide: true, maxBuffer: 64 << 20 };
  let r: SpawnSyncReturns<string>;
  if (/\.(c|m)?js$/i.test(bin)) r = spawnSync(process.execPath, [bin, ...args], o);
  else if (/\.(cmd|bat)$/i.test(bin)) {
    const all = [bin, ...args];
    if (all.some((a) => /["%^&|<>!\r\n]/.test(a))) return { ok: false, out: "" };
    const line = `"${all.map((a) => `"${a}"`).join(" ")}"`;
    r = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", line], {
      ...o,
      windowsVerbatimArguments: true,
    });
  } else r = spawnSync(bin, args, o);
  return { ok: !r.error && r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}
