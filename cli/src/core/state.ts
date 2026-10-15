// Per-project runtime state: ~/.harness/state/<project>.json (active sprint, session, task times).
import * as path from "node:path";
import { readJson, writeJson } from "./fsx";
import { home } from "./paths";

export interface TaskTimes {
  start?: string;
  end?: string;
  duration_s?: number;
}

export interface ProjectState {
  activeSprint: string | null;
  sprintOpenedAt?: string;
  session: string | null;
  tasks: Record<string, TaskTimes>;
  lastHandoff?: { file: string; at: string; consumed?: boolean };
  lastContextAlertAt?: string;
}

const EMPTY: ProjectState = { activeSprint: null, session: null, tasks: {} };

function file(project: string): string {
  return path.join(home.state(), `${project}.json`);
}

export function readState(project: string): ProjectState {
  return { ...EMPTY, tasks: {}, ...readJson<Partial<ProjectState>>(file(project), {}) };
}

export function writeState(project: string, state: ProjectState): void {
  writeJson(file(project), state);
}

export function updateState(project: string, fn: (s: ProjectState) => void): ProjectState {
  const s = readState(project);
  fn(s);
  writeState(project, s);
  return s;
}
