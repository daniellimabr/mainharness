// hx on the PATH of every shell: launchers in ~/.harness/bin pointing at the stable bundle,
// and that folder on the user's PATH (Windows: HKCU\Environment). Plugin bin/ is not enough:
// Claude Code only adds it to the Bash tool, and not reliably on Windows.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { harnessHome } from "./paths";

export const shimDir = (): string => path.join(harnessHome(), "bin");

/** Writes hx (sh, for Git Bash) and hx.cmd (PowerShell/cmd) that run <stableDir>/cli/dist/hx.js. */
export function writeShims(stableDir: string): void {
  const js = path.join(path.resolve(stableDir), "cli", "dist", "hx.js");
  const posix = js
    .replace(/\\/g, "/")
    .replace(/^([a-zA-Z]):/, (_m, d: string) => `/${d.toLowerCase()}`);
  fs.mkdirSync(shimDir(), { recursive: true });
  fs.writeFileSync(path.join(shimDir(), "hx"), `#!/bin/sh\nexec node "${posix}" "$@"\n`, {
    mode: 0o755,
  });
  fs.writeFileSync(path.join(shimDir(), "hx.cmd"), `@node "${js}" %*\r\n`);
}

/** True when some PATH entry holds an hx launcher. */
export function hxOnPath(envPath = process.env.PATH ?? ""): boolean {
  return envPath
    .split(path.delimiter)
    .filter(Boolean)
    .some((d) => ["hx", "hx.cmd"].some((f) => fs.existsSync(path.join(d, f))));
}

const reg = (args: string[]) =>
  spawnSync("reg", args, {
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

/**
 * Adds `dir` to the user PATH (Windows registry, then a setx broadcast so new processes see it).
 * Returns "added", "present" or an error message. Skipped (null) off Windows or with HARNESS_NO_PATH.
 */
export function addToUserPath(dir: string): "added" | "present" | string | null {
  if (process.platform !== "win32" || process.env.HARNESS_NO_PATH) return null;
  const q = reg(["query", "HKCU\\Environment", "/v", "Path"]);
  const cur = /Path\s+REG_(?:EXPAND_)?SZ\s+(.*)/i.exec(q.stdout ?? "")?.[1]?.trim() ?? "";
  const parts = cur.split(";").filter(Boolean);
  if (parts.some((p) => path.resolve(p).toLowerCase() === path.resolve(dir).toLowerCase()))
    return "present";
  const add = reg([
    "add",
    "HKCU\\Environment",
    "/v",
    "Path",
    "/t",
    "REG_EXPAND_SZ",
    "/d",
    [...parts, dir].join(";"),
    "/f",
  ]);
  if (add.status !== 0) return `falha ao gravar o PATH: ${(add.stderr ?? "").trim()}`;
  // setx broadcasts WM_SETTINGCHANGE, so apps started from now on get the new PATH.
  spawnSync("setx", ["HARNESS_BIN", dir], { windowsHide: true, stdio: "ignore" });
  return "added";
}
