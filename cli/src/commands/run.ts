// hx run <cmd...>: runs an agent command and prints only the summary (success) or the failures.
import { spawnSync } from "node:child_process";

const SUMMARY_RE = /\b(pass|passed|fail|failed|error|errors|warning|warnings|tests?)\b/i;
const FAIL_RE = /(error|erro|fail|falh|exception|✗|×)/i;
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

export function run(args: string[]): number {
  const parts = args[0] === "--" ? args.slice(1) : args;
  if (!parts.length) {
    console.error("uso: hx run <comando>");
    return 1;
  }
  const cmd =
    parts.length === 1
      ? (parts[0] as string)
      : parts.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ");
  const t0 = Date.now();
  // The agent's command line runs in the system shell on purpose (it is a command, not a path).
  const r = spawnSync(cmd, {
    shell: true,
    // Git Bash hands Node "c:\..."; vitest then loads itself twice (c: vs C:) and every suite fails.
    cwd: process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase()),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["inherit", "pipe", "pipe"],
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const lines = `${r.stdout ?? ""}\n${r.stderr ?? ""}`
    .replace(ANSI_RE, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim());
  const code = r.status ?? 1;
  if (code === 0 && !r.error) {
    console.log([`OK (${secs}s)`, ...lines.filter((l) => SUMMARY_RE.test(l)).slice(-5)].join("\n"));
    return 0;
  }
  const out = lines.filter((l) => FAIL_RE.test(l)).slice(0, 40);
  if (r.error) out.push(r.error.message);
  out.push("--- últimas 15 linhas ---", ...lines.slice(-15), `FALHOU (exit ${code}, ${secs}s)`);
  console.log(out.join("\n"));
  return code;
}
