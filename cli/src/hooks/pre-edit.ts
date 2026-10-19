// PreToolUse(Write|Edit|MultiEdit): denies edits to the built bundle and to the stable install.
import * as path from "node:path";
import { DEFAULT_CONFIG, loadConfig } from "../core/config";
import { isInside, samePathKey } from "../core/fsx";
import { resolveProject } from "../core/projects";
import { jsonOut, type HookInput, type HookOutcome } from "./runner";

function deny(reason: string): HookOutcome {
  return jsonOut({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  });
}

export function preEdit(input: HookInput): HookOutcome {
  const file = input.tool_input?.file_path;
  if (typeof file !== "string" || !file.trim()) return {};
  const cwd = input.cwd || process.cwd();
  let root = cwd;
  let stable = DEFAULT_CONFIG.stableDir;
  try {
    root = resolveProject(cwd)?.root ?? cwd;
    stable = loadConfig().stableDir;
  } catch {
    // invalid HARNESS_HOME: fall back to defaults and keep guarding (never fail open)
  }
  const abs = path.resolve(cwd, file);
  if (isInside(abs, stable)) return deny(`Bloqueado: nunca edite ${stable} (só via hx release).`);
  if (samePathKey(abs) === samePathKey(path.join(root, "cli", "dist", "hx.js")))
    return deny("Bloqueado: cli/dist/hx.js é gerado; edite cli/src e rode npm run build.");
  return {};
}
