// Optional skill catalog (ADR 0005): plugin skills/optional/<name> copied into <project>/.claude/skills/<name>.
import * as fs from "node:fs";
import * as path from "node:path";
import { pluginRoot } from "../core/paths";

export function catalogDir(): string {
  return path.join(pluginRoot(), "skills", "optional");
}

export function listCatalog(): string[] {
  try {
    return fs
      .readdirSync(catalogDir(), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export function projectSkillDir(root: string, name: string): string {
  return path.join(root, ".claude", "skills", name);
}

export function enableSkill(root: string, name: string): void {
  const dest = projectSkillDir(root, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(path.join(catalogDir(), name), dest, { recursive: true });
}

export function disableSkill(root: string, name: string): void {
  fs.rmSync(projectSkillDir(root, name), { recursive: true, force: true });
}

const WEB_DEPS = new Set([
  "react",
  "vue",
  "next",
  "nuxt",
  "vite",
  "svelte",
  "@sveltejs/kit",
  "@angular/core",
  "express",
  "fastify",
  "koa",
  "hono",
  "astro",
  "solid-js",
  "preact",
]);

export function isWebProject(root: string, pkg: Record<string, unknown> | null): boolean {
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) } as object;
  if (Object.keys(deps).some((d) => WEB_DEPS.has(d))) return true;
  return ["", "public", "src"].some((d) => fs.existsSync(path.join(root, d, "index.html")));
}
