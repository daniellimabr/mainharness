// S17/T12 (B109): toast on Notification and PermissionRequest, through an injectable trigger.
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { notification, permissionRequest } from "../src/hooks/attention";
import { fakeProject, isolateHome, rm } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;
beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
});
afterEach(() => {
  env.cleanup();
  rm(proj);
});

const base = () => ({ cwd: proj, session_id: "sess", transcript_path: path.join(proj, "s.jsonl") });

describe("toast", () => {
  it("PermissionRequest fires a toast without the tool input", () => {
    const calls: string[][] = [];
    permissionRequest(
      { ...base(), tool_name: "Bash", tool_input: { command: "segredo" } },
      (t, b) => calls.push([t, b]),
    );
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls)).not.toContain("segredo");
  });

  it("Notification fires a toast", () => {
    const calls: string[][] = [];
    notification({ ...base(), notification_type: "idle_prompt", message: "segredo" }, (t, b) =>
      calls.push([t, b]),
    );
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls)).not.toContain("segredo");
  });
});
