// Harness version: single source is .claude-plugin/plugin.json.
import * as path from "node:path";
import { readJson } from "./fsx";
import { pluginRoot } from "./paths";

export function harnessVersion(root = pluginRoot()): string {
  return (
    readJson<{ version?: string }>(path.join(root, ".claude-plugin", "plugin.json"), {}).version ??
    "0.0.0"
  );
}

/** Compares semver strings "x.y.z". Returns <0, 0, >0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function bumpVersion(v: string, kind: "patch" | "minor" | "major"): string {
  const [maj = 0, min = 0, pat = 0] = v.split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}
