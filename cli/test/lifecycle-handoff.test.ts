// S15/T03 (B132): one `handoff` event per handoff file, also on compaction.
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateState } from "../src/core/state";
import { emit } from "../src/events/emit";
import type { HarnessEvent } from "../src/events/schema";
import { preCompact } from "../src/hooks/lifecycle";
import { fakeProject, isolateHome, readEventsIn, rm } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;
beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
  vi.stubEnv("HARNESS_NO_LIMITS", "1");
  vi.stubEnv("HARNESS_REPO", env.home);
});
afterEach(() => {
  vi.unstubAllEnvs();
  env.cleanup();
  rm(proj);
});

const handoffs = () =>
  (readEventsIn(env.home) as unknown as HarnessEvent[]).filter((e) => e.type === "handoff");

/** What `hx handoff` does: state plus the manual event. */
function writeHandoff(name: string): void {
  updateState("proj-teste", (s) => {
    s.lastHandoff = { file: path.join(proj, name), at: new Date().toISOString(), consumed: false };
  });
  emit({ type: "handoff", project: "proj-teste", data: { mode: "manual", file: name } });
}

describe("handoff event on compaction", () => {
  it("is not repeated for a file already recorded, even across two compactions", () => {
    writeHandoff("h1.md");
    preCompact({ cwd: proj, session_id: "sess" });
    preCompact({ cwd: proj, session_id: "sess" });
    expect(handoffs().filter((e) => e.data.file === "h1.md")).toHaveLength(1);
  });

  it("records a new file again", () => {
    writeHandoff("h1.md");
    preCompact({ cwd: proj, session_id: "sess" });
    writeHandoff("h2.md");
    preCompact({ cwd: proj, session_id: "sess" });
    expect(handoffs().filter((e) => e.data.file === "h2.md")).toHaveLength(1);
    expect(handoffs()).toHaveLength(2);
  });
});
