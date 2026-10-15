// hx doctor: checks the machine and the current project for what the harness needs.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { readJson } from "../core/fsx";
import { claudeHome, home, pluginRoot } from "../core/paths";
import { resolveProject } from "../core/projects";

const TIMEOUT = 5000;
const SKILLS = [
  "adr",
  "prd",
  "sprint-plan",
  "release-report",
  "handoff",
  "security-review",
  "tdd-workflow",
  "archify",
];
const THIRD_PARTY = ["ponytail@ponytail", "security-guidance@claude-plugins-official"];
const PROJECT_PLUGINS = ["main-harness@harness-stable", ...THIRD_PARTY];

/** Finds an executable on PATH (Windows: tries PATHEXT). `claude` honors HARNESS_CLAUDE_BIN. */
function which(cmd: string): string | null {
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

/** Runs a tool without a shell string; .cmd/.bat shims go through cmd.exe with quoted args. */
export function runTool(
  cmd: string,
  args: string[],
  timeout = TIMEOUT,
): { ok: boolean; out: string } {
  const bin = which(cmd);
  if (!bin) return { ok: false, out: "" };
  const o = { encoding: "utf8" as const, timeout, windowsHide: true };
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

function pythonVersion(): string | null {
  const tries: [string, string[]][] = [
    ["python", ["--version"]],
    ["py", ["-3", "--version"]],
    ["python3", ["--version"]],
  ];
  for (const [cmd, args] of tries) {
    const m = /Python (\d+)\.(\d+)(\.\d+)?/.exec(runTool(cmd, args).out);
    if (m && (Number(m[1]) > 3 || (Number(m[1]) === 3 && Number(m[2]) >= 8))) return m[0].slice(7);
  }
  return null;
}

function pluginAvailable(id: string): boolean {
  const dir = path.join(claudeHome(), "plugins");
  const inst = readJson<{ plugins?: Record<string, unknown> } & Record<string, unknown>>(
    path.join(dir, "installed_plugins.json"),
    {},
  );
  if ((inst.plugins ?? inst)[id]) return true;
  const [name = "", market = ""] = id.split("@");
  return fs.existsSync(path.join(dir, "cache", market, name));
}

function spacesWork(hx: string): boolean {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hx doctor "));
  try {
    const f = path.join(dir, "teste com espaço.txt");
    fs.writeFileSync(f, "ok");
    if (fs.readFileSync(f, "utf8") !== "ok") return false;
    const r = spawnSync(process.execPath, [hx, "version"], {
      cwd: dir,
      encoding: "utf8",
      timeout: TIMEOUT,
      windowsHide: true,
    });
    return r.status === 0 && /\d+\.\d+\.\d+/.test(r.stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function eventsWritable(): boolean {
  try {
    fs.mkdirSync(home.events(), { recursive: true });
    const f = path.join(home.events(), `.doctor-${process.pid}.tmp`);
    fs.writeFileSync(f, "");
    fs.rmSync(f);
    return true;
  } catch {
    return false;
  }
}

export function runDoctor(opts: { projectRoot?: string } = {}): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  let problems = 0;
  const check = (ok: boolean, good: string, bad: string, warnOnly = false) => {
    if (ok) lines.push(`✓ ${good}`);
    else if (warnOnly) lines.push(`⚠ ${bad}`);
    else {
      lines.push(`✗ ${bad}`);
      problems++;
    }
  };

  const node = Number(process.versions.node.split(".")[0]);
  check(
    node >= 20,
    `Node ${process.versions.node}`,
    `Node ${process.versions.node}: instale o Node 20 ou mais novo`,
  );
  check(runTool("git", ["--version"]).ok, "git", "git não encontrado: instale o Git for Windows");
  const py = pythonVersion();
  check(
    !!py,
    `Python ${py}`,
    "Python 3.8+ não encontrado (o Security Guidance precisa): instale o Python",
  );
  check(
    runTool("claude", ["--version"]).ok,
    "CLI claude",
    "CLI claude não encontrado: instale o Claude Code",
  );
  check(
    fs.existsSync(home.config()),
    "config.json",
    `config.json ausente em ${home.config()}: rode hx setup`,
  );

  const markets = readJson<Record<string, unknown>>(
    path.join(claudeHome(), "plugins", "known_marketplaces.json"),
    {},
  );
  check(
    !!markets["harness-stable"],
    "marketplace harness-stable",
    "marketplace harness-stable não registrado: rode hx setup",
  );

  const root = opts.projectRoot ?? resolveProject(process.cwd())?.root ?? null;
  for (const id of THIRD_PARTY)
    check(
      pluginAvailable(id),
      `${id} disponível`,
      `${id} não instalado: claude plugin install ${id}`,
      !root,
    );

  if (root) {
    const st = readJson<{ enabledPlugins?: Record<string, boolean>; env?: Record<string, string> }>(
      path.join(root, ".claude", "settings.json"),
      {},
    );
    const off = PROJECT_PLUGINS.filter((id) => st.enabledPlugins?.[id] !== true);
    check(
      !off.length,
      "plugins ativos no projeto",
      `plugins não ativos no projeto (${off.join(", ")}): rode /attach`,
    );
    const envOk = st.env?.ENABLE_STOP_REVIEW === "0" && st.env?.ENABLE_COMMIT_REVIEW === "0";
    check(
      envOk,
      "ENABLE_STOP_REVIEW e ENABLE_COMMIT_REVIEW desligados",
      'ENABLE_STOP_REVIEW/ENABLE_COMMIT_REVIEW devem ser "0" no .claude/settings.json: rode /attach',
    );
  }

  let plugin: string | null = null;
  try {
    plugin = pluginRoot();
  } catch {
    // reported below
  }
  const missing = SKILLS.filter(
    (s) => !plugin || !fs.existsSync(path.join(plugin, "skills", s, "SKILL.md")),
  );
  check(
    !missing.length,
    "skills do plugin",
    `skills ausentes no plugin: ${missing.join(", ")}`,
    true,
  );
  const hx = plugin ? path.join(plugin, "cli", "dist", "hx.js") : "";
  const hasHx = !!plugin && fs.existsSync(hx);
  check(hasHx, "cli/dist/hx.js", "cli/dist/hx.js ausente: rode npm run build no harness");
  check(
    hasHx && spacesWork(hx),
    "caminhos com espaço",
    "falha com caminhos com espaço: veja os logs em .harness/logs",
  );
  check(
    eventsWritable(),
    "pasta de eventos gravável",
    `não consigo gravar em ${home.events()}: confira as permissões`,
  );

  lines.push(problems ? `${problems} problema${problems > 1 ? "s" : ""}` : "Tudo certo");
  return { ok: problems === 0, lines };
}

export function run(_args: string[]): number {
  const r = runDoctor();
  for (const l of r.lines) console.log(l);
  return r.ok ? 0 : 1;
}
