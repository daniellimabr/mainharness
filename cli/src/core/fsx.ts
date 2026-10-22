// Small filesystem helpers: safe JSON reads and atomic writes.
import * as fs from "node:fs";
import * as path from "node:path";

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(file: string, value: unknown): void {
  writeFileAtomic(file, JSON.stringify(value, null, 2) + "\n");
}

export function writeFileAtomic(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content);
  // Windows can lock the target for a moment (antivirus, indexer, another reader).
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt >= 5 || !["EPERM", "EBUSY", "EACCES"].includes(code ?? "")) {
        fs.rmSync(tmp, { force: true });
        throw err;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 20);
    }
  }
}

export function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

export function exists(p: string): boolean {
  return fs.existsSync(p);
}

/** Normalizes a path for comparison (Windows paths are case-insensitive). */
export function samePathKey(p: string): string {
  const r = path.resolve(p).replace(/[\\/]+$/, "");
  return process.platform === "win32" ? r.toLowerCase() : r;
}

/** True when `child` is `parent` or inside it. */
export function isInside(child: string, parent: string): boolean {
  const c = samePathKey(child);
  const p = samePathKey(parent);
  return c === p || c.startsWith(p + path.sep);
}
