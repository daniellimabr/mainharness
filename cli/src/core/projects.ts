// Connected projects: ~/.harness/projects.json and <project>/.claude/harness.json.
import * as fs from "node:fs";
import * as path from "node:path";
import { isInside, readJson, writeJson } from "./fsx";
import { home } from "./paths";

export interface ProjectEntry {
  id: string;
  name: string;
  path: string;
  version: string;
  attachedAt: string;
}

export interface HarnessJson {
  project: string;
  name: string;
  version: string;
  attachedAt: string;
  web: boolean;
  optionalSkills: string[];
  migrations?: string[];
}

/** "Dashboard IA" -> "dashboard-ia". No spaces, only [a-z0-9-]. */
export function slugify(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "project";
}

export function readProjects(): ProjectEntry[] {
  return readJson<{ projects: ProjectEntry[] }>(home.projects(), { projects: [] }).projects;
}

export function registerProject(entry: ProjectEntry): void {
  const list = readProjects().filter((p) => p.id !== entry.id);
  list.push(entry);
  list.sort((a, b) => a.id.localeCompare(b.id));
  writeJson(home.projects(), { projects: list });
}

export function harnessJsonPath(projectDir: string): string {
  return path.join(projectDir, ".claude", "harness.json");
}

/** Walks up from `dir` to the folder that holds .claude/harness.json. */
export function findProjectRoot(dir: string): string | null {
  let cur = path.resolve(dir);
  for (;;) {
    if (fs.existsSync(harnessJsonPath(cur))) return cur;
    const up = path.dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
}

export function readHarnessJson(projectDir: string): HarnessJson | null {
  return readJson<HarnessJson | null>(harnessJsonPath(projectDir), null);
}

export function writeHarnessJson(projectDir: string, data: HarnessJson): void {
  writeJson(harnessJsonPath(projectDir), data);
}

export interface ProjectContext {
  id: string;
  root: string;
  harness: HarnessJson;
}

/** Resolves the attached project for a working directory, or null when not attached. */
export function resolveProject(cwd: string): ProjectContext | null {
  const root = findProjectRoot(cwd);
  if (!root) return null;
  const harness = readHarnessJson(root);
  if (!harness) return null;
  return { id: harness.project, root, harness };
}

/** Finds a registered project by a path inside it (longest match). */
export function projectByPath(p: string): ProjectEntry | null {
  const hits = readProjects().filter((e) => isInside(p, e.path));
  hits.sort((a, b) => b.path.length - a.path.length);
  return hits[0] ?? null;
}
