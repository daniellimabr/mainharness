// S13/T07: `attention` (Notification, PermissionRequest) and `error` (StopFailure, PostToolUseFailure), metadata only.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { home } from "../src/core/paths";
import { updateState } from "../src/core/state";
import { type HarnessEvent, validateEvent } from "../src/events/schema";
import {
  notification,
  permissionRequest,
  postToolUseFailure,
  stopFailure,
} from "../src/hooks/attention";
import { runHook } from "../src/hooks/runner";
import { fakeProject, isolateHome, readEventsIn, rm } from "./helpers";

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

const all = () => readEventsIn(env.home) as unknown as HarnessEvent[];
const base = () => ({ cwd: proj, session_id: "sess", transcript_path: path.join(proj, "s.jsonl") });
const SECRET = "rm -rf / && echo segredo";

describe("attention", () => {
  it("Notification: notification_type only, never the message", () => {
    updateState("proj-teste", (s) => {
      s.activeSprint = "S13";
      s.tasks = { T07: { start: "2026-10-29T09:00:00Z" } };
    });
    notification({
      ...base(),
      notification_type: "permission_prompt",
      message: SECRET,
      title: SECRET,
    });
    const [e] = all();
    expect(e?.type).toBe("attention");
    expect(e?.task).toBe("T07");
    expect(e?.sprint).toBe("S13");
    expect(e?.data).toEqual({ source: "notification", kind: "permission_prompt", agent_id: null });
    expect(validateEvent(e)).toEqual([]);
    expect(JSON.stringify(all())).not.toContain("segredo");
  });

  it("PermissionRequest: tool name and agent_id, never the tool input", () => {
    permissionRequest({
      ...base(),
      agent_id: "a1",
      tool_name: "Bash",
      tool_input: { command: SECRET },
    });
    const [e] = all();
    expect(e?.data).toEqual({ source: "permission", kind: "Bash", agent_id: "a1" });
    expect(JSON.stringify(all())).not.toContain("segredo");
  });
});

describe("error", () => {
  it("StopFailure: error type only", () => {
    stopFailure({
      ...base(),
      error: "rate_limit",
      error_details: SECRET,
      last_assistant_message: SECRET,
    });
    const [e] = all();
    expect(e?.type).toBe("error");
    expect(e?.data).toEqual({ source: "stop", kind: "rate_limit", agent_id: null });
    expect(JSON.stringify(all())).not.toContain("segredo");
  });

  it("PostToolUseFailure: tool name only, never the error text or input", () => {
    postToolUseFailure({
      ...base(),
      tool_name: "Bash",
      tool_input: { command: SECRET },
      error: SECRET,
    });
    const [e] = all();
    expect(e?.data).toEqual({ source: "tool", kind: "Bash", agent_id: null });
    expect(JSON.stringify(all())).not.toContain("segredo");
  });

  it("odd or missing kind becomes unknown", () => {
    stopFailure({ ...base(), error: SECRET });
    notification(base());
    expect(all().map((e) => e.data.kind)).toEqual(["unknown", "unknown"]);
  });
});

describe("invalid input", () => {
  it("bad JSON exits 0 and goes to the error log", async () => {
    expect(await runHook("notification", notification, "{not json")).toBe(0);
    const logs = fs
      .readdirSync(home.logs())
      .map((f) => fs.readFileSync(path.join(home.logs(), f), "utf8"));
    expect(logs.join("")).toContain("[hook notification]");
    expect(all()).toEqual([]);
  });

  it("outside a project emits nothing", () => {
    expect(notification({ cwd: env.home, notification_type: "idle_prompt" })).toEqual({});
    expect(all()).toEqual([]);
  });
});
