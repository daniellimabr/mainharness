// B005: resume the chat after the usage limit (StopFailure rate_limit → schtasks → hx resume).
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { pendingResumes, run as resume, scheduleResume, type Run } from "../src/commands/resume";
import { emit } from "../src/events/emit";
import { stopFailure } from "../src/hooks/lifecycle";
import { fakeProject, isolateHome, readEventsIn, rm } from "./helpers";

const S = "0f8fad5b-d9cb-469f-a165-70867728950e";
let env: ReturnType<typeof isolateHome>;
let proj: string;
let calls: { cmd: string; args: string[]; cwd?: string; xml?: string }[];

const fake: Run = (cmd, args, cwd) => {
  const i = args.indexOf("/xml");
  const xml = i >= 0 ? fs.readFileSync(args[i + 1] ?? "", "utf16le") : undefined;
  calls.push({ cmd, args, cwd, xml });
  return { ok: true, out: "" };
};

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
  calls = [];
});
afterEach(() => {
  env.cleanup();
  rm(proj);
});

// 15:00 local reset, "now" well before it
const reset = new Date(2026, 9, 21, 15, 0, 0).toISOString();
const now = new Date(2026, 9, 21, 12, 0, 0).getTime();

it("schedules a one-time task 2 min after the reset, in local time, replacing the old one", () => {
  expect(scheduleResume(S, proj, reset, { run: fake, now })).toBe(true);
  const c = calls[0];
  expect(c?.cmd).toBe("schtasks");
  expect(c?.args).toEqual(
    expect.arrayContaining(["/create", "/tn", `MainHarness-Resume-${S}`, "/f"]),
  );
  expect(c?.xml).toContain("<StartBoundary>2026-10-21T15:02:00</StartBoundary>");
  expect(c?.xml).toContain(`resume ${S} &quot;${proj}&quot;`);
  expect(c?.xml).toContain(`<WorkingDirectory>${proj}</WorkingDirectory>`);
  expect(pendingResumes()).toMatchObject([{ session: S, dir: proj }]);
  // second limit hit of the same session: same task name (/f replaces), one pending entry
  const later = new Date(2026, 9, 21, 20, 0, 0).toISOString();
  scheduleResume(S, proj, later, { run: fake, now });
  expect(calls[1]?.args).toContain(`MainHarness-Resume-${S}`);
  expect(calls[1]?.xml).toContain("2026-10-21T20:02:00");
  expect(pendingResumes()).toHaveLength(1);
});

it("a reset already in the past is scheduled a bit ahead of now", () => {
  scheduleResume(S, proj, new Date(now - 3600_000).toISOString(), { run: fake, now });
  expect(calls[0]?.xml).toContain("2026-10-21T12:02:00");
});

it.each([
  ["session not a UUID", 'x" & calc', "", reset],
  ["relative dir", S, "-proj", reset],
  ["missing dir", S, "nope", reset],
  ["dir with quote", S, '"', reset],
  ["dir with metachar", S, "&calc", reset],
  ["bad reset", S, "", "soon"],
])("refuses %s", (_, session, suffix, at) => {
  // suffix is appended to the real project folder ("-proj" alone = relative path)
  const dir = suffix === "-proj" ? "proj" : suffix ? path.join(proj, suffix) : proj;
  expect(scheduleResume(session, dir, at, { run: fake, now })).toBe(false);
  expect(calls).toEqual([]);
  expect(pendingResumes()).toEqual([]);
});

it("hx resume runs claude --resume in the folder, emits an event and deletes its task", () => {
  scheduleResume(S, proj, reset, { run: fake, now });
  calls = [];
  expect(resume([S, proj], { run: fake })).toBe(0);
  expect(calls[0]).toMatchObject({
    cmd: "claude",
    args: ["--resume", S, "-p", "Continue de onde parou."],
    cwd: proj,
  });
  expect(calls[1]).toMatchObject({
    cmd: "schtasks",
    args: ["/delete", "/tn", `MainHarness-Resume-${S}`, "/f"],
  });
  expect(pendingResumes()).toEqual([]);
  expect(readEventsIn(env.home).filter((e) => e.type === "session.resume")).toMatchObject([
    { project: "proj-teste", session: S, data: { ok: true } },
  ]);
});

it("hx resume keeps the task a new limit hit rescheduled while claude ran", () => {
  scheduleResume(S, proj, reset, { run: fake, now });
  const later = new Date(2026, 9, 21, 20, 0, 0).toISOString();
  const during: Run = (cmd, args, cwd) => {
    if (cmd === "claude") scheduleResume(S, proj, later, { run: fake, now });
    return fake(cmd, args, cwd);
  };
  calls = [];
  expect(resume([S, proj], { run: during })).toBe(0);
  expect(calls.some((c) => c.args.includes("/delete"))).toBe(false);
  expect(pendingResumes()).toMatchObject([
    { session: S, at: new Date(2026, 9, 21, 20, 2).toISOString() },
  ]);
});

it("hx resume refuses malformed input without running anything", () => {
  expect(resume(["nope", proj], { run: fake })).toBe(1);
  expect(resume([S], { run: fake })).toBe(1);
  expect(calls).toEqual([]);
});

const limits = (five: number, week: number) =>
  emit({
    type: "usage.limits",
    project: "proj-teste",
    data: {
      five_hour: five,
      five_hour_resets_at: reset,
      seven_day: week,
      seven_day_resets_at: new Date(2026, 9, 25, 9, 0, 0).toISOString(),
    },
  });

it("StopFailure rate_limit schedules with the window that ran out", async () => {
  limits(100, 40);
  await stopFailure({ cwd: proj, session_id: S, error: "rate_limit" }, { run: fake, now });
  expect(calls[0]?.xml).toContain("2026-10-21T15:02:00");
  calls = [];
  limits(70, 100);
  await stopFailure({ cwd: proj, session_id: S, error: "rate_limit" }, { run: fake, now });
  expect(calls[0]?.xml).toContain("2026-10-25T09:02:00");
});

it("other StopFailure errors and a missing reading schedule nothing", async () => {
  await stopFailure({ cwd: proj, session_id: S, error: "rate_limit" }, { run: fake, now });
  limits(100, 40);
  await stopFailure({ cwd: proj, session_id: S, error: "server_error" }, { run: fake, now });
  expect(calls).toEqual([]);
});
