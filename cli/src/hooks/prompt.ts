// UserPromptSubmit: one `prompt` event per command from Daniel (time and session only, never the text).
import { resolveProject } from "../core/projects";
import { readState } from "../core/state";
import { emit } from "../events/emit";
import type { HookInput, HookOutcome } from "./runner";

export function prompt(input: HookInput): HookOutcome {
  const p = resolveProject(input.cwd || process.cwd());
  if (!p) return {};
  emit({
    type: "prompt",
    project: p.id,
    session: input.session_id || null,
    sprint: readState(p.id).activeSprint,
    data: {},
  });
  return {};
}
