// hx setup: one-time machine install (config, marketplace, user-level /attach skill).
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseArgs } from "../core/args";
import { ensureConfig, loadConfig } from "../core/config";
import { readJson, readText, writeJson } from "../core/fsx";
import { claudeHome, home, pluginRoot } from "../core/paths";
import { addToUserPath, shimDir, writeShims } from "../core/shim";
import { runTool } from "../core/proc";

const PLACEHOLDER = "C:/harness-stable";

/** HOME in the user's environment (registry), not the process: Git Bash invents one when missing. */
export function userHomeVarSet(): boolean {
  if (process.platform !== "win32") return true;
  return (
    spawnSync("reg", ["query", "HKCU\\Environment", "/v", "HOME"], { windowsHide: true }).status ===
    0
  );
}

/** Turns the ponytail band off; on Windows the ponytail needs HOME, set via setx. */
export function disablePonytailBand(
  // HARNESS_NO_PATH: never touch the user's environment (tests).
  setx: (args: string[]) => unknown = (a) => process.env.HARNESS_NO_PATH || runTool("setx", a),
  homeVarSet: () => boolean = userHomeVarSet,
): void {
  // shortcut: the ponytail reads $HOME/.claude, we write claudeHome() (CLAUDE_CONFIG_DIR wins), upgrade if someone moves the Claude dir.
  fs.mkdirSync(claudeHome(), { recursive: true });
  fs.writeFileSync(path.join(claudeHome(), ".ponytail-band"), "off");
  if (!homeVarSet()) setx(["HOME", os.homedir()]);
}

/** Auto mode's classifier denies hx as "Self-Modification"; project permissions.allow does not help (B044). */
export const AUTO_MODE_RULE =
  "Running the hx CLI (hx sprint, hx task, hx handoff, hx eval, hx review, hx usage) in any project is allowed: it is the Main Harness sprint tooling the user installed. hx run is allowed only when the wrapped command would be allowed on its own.";

type Settings = { autoMode?: { allow?: string[] } & Record<string, unknown> } & Record<
  string,
  unknown
>;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function hasAutoModeRule(): boolean {
  const allow = readJson<Settings>(path.join(claudeHome(), "settings.json"), {})?.autoMode?.allow;
  return Array.isArray(allow) && allow.includes(AUTO_MODE_RULE);
}

/** Adds AUTO_MODE_RULE to autoMode.allow of the user's settings.json, keeping everything else. */
export function ensureAutoModeRule(): "added" | "present" | "invalid" {
  const file = path.join(claudeHome(), "settings.json");
  const text = readText(file)?.trim();
  let st: Settings = {};
  if (text) {
    try {
      st = JSON.parse(text) as Settings;
    } catch {
      return "invalid"; // never overwrite a settings.json we cannot parse
    }
  }
  if (!isObj(st) || (st.autoMode !== undefined && !isObj(st.autoMode))) return "invalid";
  if (st.autoMode?.allow !== undefined && !Array.isArray(st.autoMode.allow)) return "invalid";
  const auto = (st.autoMode ??= {});
  // "$defaults" keeps Claude Code's built-in rules when we create the list.
  const allow = (auto.allow ??= ["$defaults"]);
  if (allow.includes(AUTO_MODE_RULE)) return "present";
  allow.push(AUTO_MODE_RULE);
  writeJson(file, st);
  return "added";
}

export function run(args: string[]): number {
  const dry = parseArgs(args).flags["dry-run"] === true;
  const say = (msg: string) => console.log(dry ? `[simulação] ${msg}` : msg);

  if (fs.existsSync(home.config())) say("config.json já existe");
  else {
    if (!dry) ensureConfig();
    say(`config.json criado em ${home.config()}`);
  }
  const cfg = loadConfig();

  const known = readJson<Record<string, unknown>>(
    path.join(claudeHome(), "plugins", "known_marketplaces.json"),
    {},
  );
  if (known["harness-stable"]) say("marketplace harness-stable já registrado");
  else {
    say(`registrando marketplace: claude plugin marketplace add "${cfg.stableDir}"`);
    if (!dry) {
      const r = runTool("claude", ["plugin", "marketplace", "add", cfg.stableDir], 60000);
      if (!r.ok) {
        console.error(`Falha ao registrar o marketplace: ${r.out || "claude não encontrado"}`);
        return 1;
      }
    }
  }

  const src = path.join(pluginRoot(), "skills-user", "attach");
  const dest = path.join(claudeHome(), "skills", "attach");
  say(`instalando a skill /attach em ${dest}`);
  if (!dry) {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(src, dest, { recursive: true });
    const skill = path.join(dest, "SKILL.md");
    const stable = cfg.stableDir.replace(/\\/g, "/").replace(/\/+$/, "");
    fs.writeFileSync(skill, fs.readFileSync(skill, "utf8").split(PLACEHOLDER).join(stable));
  }
  say("desligando o painel do ponytail (Task board: /plugin → ponytail → Task board)");
  if (!dry) disablePonytailBand();
  say("liberando o hx no modo auto (autoMode.allow em ~/.claude/settings.json)");
  if (!dry && ensureAutoModeRule() === "invalid")
    console.error("settings.json do Claude ilegível: corrija o JSON e rode hx setup de novo");
  say(`instalando o comando hx em ${shimDir()} (aponta para ${cfg.stableDir})`);
  let restart = false;
  if (!dry) {
    writeShims(cfg.stableDir);
    const r = addToUserPath(shimDir());
    if (r === "added") {
      say("pasta do hx adicionada ao PATH do usuário");
      restart = true;
    } else if (r && r !== "present") console.error(r);
  }
  say(
    restart
      ? "Pronto. Feche e abra o VS Code para o hx valer nos chats novos; depois rode hx doctor."
      : "Pronto. Rode hx doctor para conferir.",
  );
  return 0;
}
