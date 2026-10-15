// hx skills [on|off <name>]: lists or toggles optional catalog skills in the current project (ADR 0005).
import { disableSkill, enableSkill, listCatalog } from "../attach/skills";
import { resolveProject, writeHarnessJson } from "../core/projects";

export function run(args: string[]): number {
  const [action, name] = args;
  const p = resolveProject(process.cwd());
  if (!p) {
    console.error("hx skills: este repo não está conectado ao harness (rode /attach)");
    return 1;
  }
  const catalog = listCatalog();
  const on = new Set(p.harness.optionalSkills);
  if (!action) {
    if (!catalog.length) console.log("Catálogo opcional vazio.");
    for (const s of catalog) console.log(`${s}: ${on.has(s) ? "ligada" : "desligada"}`);
    return 0;
  }
  if ((action !== "on" && action !== "off") || !name) {
    console.error("uso: hx skills [on|off <nome>]");
    return 1;
  }
  if (!catalog.includes(name)) {
    console.error(`hx skills: "${name}" não está no catálogo (${catalog.join(", ") || "vazio"})`);
    return 1;
  }
  if (action === "on") {
    enableSkill(p.root, name);
    on.add(name);
  } else {
    disableSkill(p.root, name);
    on.delete(name);
  }
  writeHarnessJson(p.root, { ...p.harness, optionalSkills: [...on].sort() });
  console.log(
    `Skill ${name} ${action === "on" ? "ligada" : "desligada"}. Abra um chat novo para valer.`,
  );
  return 0;
}
