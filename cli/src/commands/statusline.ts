// hx statusline: Claude Code status line (stdin JSON). Records the usage limits and chat title.
import { resolveProject } from "../core/projects";
import { type ProjectState, readState, updateState } from "../core/state";
import { emit } from "../events/emit";
import { readStdin } from "../hooks/runner";
import { safeText } from "../hooks/session-start";

type State = ProjectState & { lastStatusline?: string };

interface Input {
  session_id?: unknown;
  session_name?: unknown;
  cwd?: unknown;
  workspace?: { current_dir?: unknown };
  rate_limits?: Record<string, { used_percentage?: unknown } | undefined>;
}

const pct = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Returns the line to print; records a `statusline` event when the values changed. */
export function statusline(raw: string): string {
  let inp: Input;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null || Array.isArray(v)) return "hx";
    inp = v as Input;
  } catch {
    return "hx";
  }
  const five = pct(inp.rate_limits?.five_hour?.used_percentage);
  const week = pct(inp.rate_limits?.seven_day?.used_percentage);
  const chat = str(inp.session_name);
  const name = chat ? safeText(chat) : undefined;
  const title = name?.trim() ? name : undefined;

  const p = resolveProject(str(inp.workspace?.current_dir) ?? str(inp.cwd) ?? process.cwd());
  if (p) {
    const session = str(inp.session_id);
    const key = JSON.stringify([session, five, week, title]);
    // Status line refreshes often: record only when something changed.
    const st: State = readState(p.id);
    if (st.lastStatusline !== key) {
      try {
        emit({
          type: "statusline",
          project: p.id,
          session,
          sprint: st.activeSprint,
          data: { five_hour: five, seven_day: week, ...(title ? { title } : {}) },
        });
        updateState(p.id, (s) => {
          (s as State).lastStatusline = key;
        });
      } catch {
        // a bad event must not hide the percentages from the line
      }
    }
  }
  const parts = [
    title,
    five === null ? null : `5h ${Math.round(five)}%`,
    week === null ? null : `sem ${Math.round(week)}%`,
  ].filter(Boolean);
  return parts.join(" · ") || "hx";
}

export function run(_args: string[]): number {
  try {
    console.log(statusline(readStdin()));
  } catch {
    console.log("hx"); // the status line must never fail
  }
  return 0;
}
