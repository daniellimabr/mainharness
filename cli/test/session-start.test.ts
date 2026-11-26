// session-start after a compaction brings back the task in progress and the runtime state, not only the handoff.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerProject } from "../src/core/projects";
import { updateState } from "../src/core/state";
import { sessionStart } from "../src/hooks/session-start";
import { fakeProject, isolateHome, rm } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;

function context(source: string): string {
  const out = sessionStart({ cwd: proj, session_id: "s1", source });
  const json = JSON.parse(out.stdout ?? "{}") as {
    hookSpecificOutput?: { additionalContext?: string };
  };
  return json.hookSpecificOutput?.additionalContext ?? "";
}

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
  const at = "2026-10-15T00:00:00Z";
  registerProject({ id: "proj-teste", name: "A", path: proj, version: "0.1.0", attachedAt: at });
});
afterEach(() => {
  env.cleanup();
  rm(proj);
});

describe("session-start: source=compact", () => {
  it("brings the task in progress and the sprint", () => {
    updateState("proj-teste", (s) => {
      s.activeSprint = "S07";
      s.tasks = {
        T01: { start: "2026-10-15T00:00:00Z", end: "2026-10-15T00:10:00Z", duration_s: 600 },
        T02: { start: "2026-10-15T00:10:00Z", phase: "código" },
      };
    });
    const out = context("compact");
    expect(out).toContain("S07");
    expect(out).toContain("Tarefa em andamento: T02 (código)");
    expect(out).not.toContain("T01 (");
  });

  it("omits the line without a task in progress", () => {
    updateState("proj-teste", (s) => {
      s.activeSprint = "S07";
    });
    expect(context("compact")).not.toContain("em andamento");
  });
});
