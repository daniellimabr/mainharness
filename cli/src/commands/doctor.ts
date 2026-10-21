// hx doctor: checks the machine and the current project for what the harness needs.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { PLUGINS } from "../attach/setup";
import { readJson, readText, samePathKey } from "../core/fsx";
import { runTool } from "../core/proc";
import { claudeHome, home, pluginRoot } from "../core/paths";
import { resolveProject } from "../core/projects";
import { hxOnPath } from "../core/shim";
import { compareVersions } from "../core/version";
import { hasAutoModeRule, hasStatusLine, userHomeVarSet } from "./setup";

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
const THIRD_PARTY = PLUGINS.filter((id) => !id.startsWith("main-harness@"));

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

interface Install {
  scope?: string;
  projectPath?: string;
  version?: string;
}

/** Version installed for `root` (project/local scope there, else user scope); null if missing. */
function installedVersion(id: string, root: string): string | null {
  const inst = readJson<{ plugins?: Record<string, Install[]> }>(
    path.join(claudeHome(), "plugins", "installed_plugins.json"),
    {},
  );
  const list = inst.plugins?.[id] ?? [];
  const hit =
    list.find((i) => i.projectPath && samePathKey(i.projectPath) === samePathKey(root)) ??
    list.find((i) => i.scope === "user");
  return hit ? (hit.version ?? "") : null;
}

/** Version the plugin's marketplace offers now (entry version or the plugin's plugin.json). */
function availableVersion(id: string): string | null {
  const [name = "", market = ""] = id.split("@");
  const known = readJson<Record<string, { installLocation?: string }>>(
    path.join(claudeHome(), "plugins", "known_marketplaces.json"),
    {},
  );
  const loc = known[market]?.installLocation;
  if (!loc) return null;
  const mk = readJson<{ plugins?: { name: string; source?: unknown; version?: string }[] }>(
    path.join(loc, ".claude-plugin", "marketplace.json"),
    {},
  );
  const entry = mk.plugins?.find((p) => p.name === name);
  if (!entry) return null;
  if (entry.version) return entry.version;
  if (typeof entry.source !== "string") return null;
  return (
    readJson<{ version?: string }>(
      path.join(loc, entry.source, ".claude-plugin", "plugin.json"),
      {},
    ).version ?? null
  );
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

export function runDoctor(opts: { projectRoot?: string; homeVarSet?: () => boolean } = {}): {
  ok: boolean;
  lines: string[];
} {
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
  // claude-opus-5-5 (Tech Lead/Reviewer) needs Claude Code 2.1.280+.
  const cv = /(\d+\.\d+\.\d+)/.exec(runTool("claude", ["--version"]).out)?.[1];
  check(
    !!cv && compareVersions(cv, "2.1.280") >= 0,
    `CLI claude ${cv}`,
    cv
      ? `CLI claude ${cv} é antigo para o Opus 5.5: rode claude update (mínimo 2.1.280)`
      : "CLI claude não encontrado: instale o Claude Code",
  );
  check(
    hxOnPath(),
    "comando hx no PATH",
    "comando hx fora do PATH: rode hx setup e reabra o VS Code",
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

  const band = readText(path.join(claudeHome(), ".ponytail-band"))?.trim();
  if (band !== "off" || !(opts.homeVarSet ?? userHomeVarSet)())
    lines.push(
      "⚠ painel do ponytail ligado: rode hx setup e reinicie o VS Code. O Task board desliga em /plugin → ponytail → Task board (o hx não mexe na config do plugin)",
    );

  check(
    hasAutoModeRule(),
    "hx liberado no modo auto",
    "hx sem regra no modo auto (autoMode.allow do ~/.claude/settings.json): rode hx setup",
    true,
  );
  check(
    hasStatusLine(),
    "status line configurada",
    "sem status line (o % do limite e o título do chat não são gravados): rode hx setup",
    true,
  );

  const root = opts.projectRoot ?? resolveProject(process.cwd())?.root ?? null;
  if ((root ?? process.cwd()).includes(" "))
    lines.push(
      '⚠ pasta do projeto com espaço: o Bash do Claude Code imprime "claude-XXXX-cwd: No such file or directory" e "Exit code 1" (é do Claude Code; leia a saída real). Não faça cd no início (o Bash já abre no projeto); se precisar, cd "C:/Pasta Com Espaço"; prefira o PowerShell quando o Bash não for necessário',
    );
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
    for (const id of PLUGINS) {
      const have = installedVersion(id, root);
      const want = availableVersion(id);
      if (have === null) check(false, "", `${id} não instalado no projeto: rode /attach`, true);
      else if (want && have !== want)
        check(
          false,
          "",
          `${id} desatualizado no projeto (${have || "?"}; disponível ${want}): claude plugin update ${id} --scope project`,
          true,
        );
      else lines.push(`✓ ${id} ${have} no projeto`);
    }
    const off = PLUGINS.filter((id) => st.enabledPlugins?.[id] !== true);
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
