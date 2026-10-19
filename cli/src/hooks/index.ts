// hx hook <name>: dispatches Claude Code hook events (stdin JSON) to their handlers.
import { preCompact, sessionEnd, stop, subagentStop } from "./lifecycle";
import { postEdit } from "./post-edit";
import { preBash } from "./pre-bash";
import { preEdit } from "./pre-edit";
import { type HookHandler, runHook } from "./runner";
import { sessionStart } from "./session-start";

const HOOKS: Record<string, HookHandler> = {
  "session-start": sessionStart,
  "post-edit": postEdit,
  "pre-bash": preBash,
  "pre-edit": preEdit,
  stop,
  "subagent-stop": subagentStop,
  "pre-compact": preCompact,
  "session-end": sessionEnd,
};

export function run(args: string[]): Promise<number> | number {
  const name = args[0] ?? "";
  const handler = HOOKS[name];
  if (!handler) {
    console.error(`hx hook: hook desconhecido: ${name}`);
    return 0;
  }
  return runHook(name, handler);
}
