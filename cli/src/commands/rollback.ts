// hx rollback: moves the stable clone back to the previous release tag.
import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig } from "../core/config";
import { emit } from "../events/emit";
import { git, versionTags } from "../release/git";

export function run(_args: string[]): number {
  const stable = path.resolve(loadConfig().stableDir);
  if (!fs.existsSync(path.join(stable, ".git")))
    throw new Error(`versão estável não encontrada em ${stable}`);
  git(stable, ["fetch", "-q", "--tags", "origin"], true);
  const current = git(stable, ["describe", "--tags", "--exact-match", "HEAD"], true);
  const tags = versionTags(stable);
  const i = tags.indexOf(current);
  const target = i > 0 ? tags[i - 1] : undefined;
  if (!current || !target) {
    console.error(`Não há versão anterior para voltar (atual: ${current || "desconhecida"}).`);
    return 1;
  }
  if (git(stable, ["status", "--porcelain"])) throw new Error(`${stable} tem alterações locais`);
  git(stable, ["checkout", "-q", "--detach", target]);
  emit({ type: "harness.rollback", project: "main-harness", data: { from: current, to: target } });
  console.log(`Daniel: a versão estável do harness voltou de ${current} para ${target}.`);
  console.log("Os projetos voltam para ela no próximo chat (o session-start migra para trás).");
  return 0;
}
