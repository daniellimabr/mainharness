// Writes ~/.harness/dashboard/<project>.json (contract: docs/contracts/state.md). Never throws.
import * as path from "node:path";
import { writeFileAtomic } from "../core/fsx";
import { logError } from "../core/log";
import { home } from "../core/paths";
import { readEvents } from "../events/emit";
import { buildState } from "./build";

/** Rebuilds and writes one project's state. Throws (bad id, unwritable folder); used by `hx state rebuild`. */
export function rebuildDashboardState(project: string): void {
  if (!project || project !== path.basename(project)) throw new Error(`id inválido: "${project}"`);
  // shortcut: rereads every event on each write (O(all events)); add an incremental cache if slow.
  const state = buildState(
    readEvents((e) => e.project === project),
    { project },
  );
  writeFileAtomic(
    path.join(home.dashboard(), `${project}.json`),
    JSON.stringify(state, null, 2) + "\n",
  );
}

export function writeDashboardState(project: string): void {
  if (process.env.HARNESS_DASHBOARD === "off") return;
  if (!project || project !== path.basename(project)) return; // no id, or not a safe file name
  try {
    rebuildDashboardState(project);
  } catch (err) {
    logError("state", err);
  }
}
