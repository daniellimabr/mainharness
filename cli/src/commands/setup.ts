// hx setup: one-time machine install (config, marketplace, user-level /attach skill).
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "../core/args";
import { ensureConfig, loadConfig } from "../core/config";
import { readJson } from "../core/fsx";
import { claudeHome, home, pluginRoot } from "../core/paths";
import { addToUserPath, shimDir, writeShims } from "../core/shim";
import { runTool } from "../core/proc";

const PLACEHOLDER = "C:/harness-stable";

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
