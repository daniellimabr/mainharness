// S11/T04 (ADR 0013): usage no longer triggers any nudge; the model per role does not depend on the %.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { run as task } from "../src/commands/task";
import { loadConfig } from "../src/core/config";
import { updateState } from "../src/core/state";
import { emit } from "../src/events/emit";
import { stop } from "../src/hooks/lifecycle";
import { fakeProject, isolateHome, REPO_ROOT, rm } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
  process.env.HARNESS_NO_LIMITS = "1";
});
afterEach(() => {
  delete process.env.HARNESS_NO_LIMITS;
  delete process.env.HARNESS_SESSION;
  vi.restoreAllMocks();
  env.cleanup();
  rm(proj);
});

const limits = (five_hour: number, seven_day: number) =>
  emit({
    type: "usage.limits",
    project: "proj-teste",
    session: null,
    sprint: null,
    data: { five_hour, five_hour_resets_at: null, seven_day, seven_day_resets_at: null },
  });

it("Stop shows no usage warning at 91%", () => {
  limits(91, 95);
  const out = stop({ cwd: proj, session_id: "s1" }).stdout ?? "{}";
  expect((JSON.parse(out) as { systemMessage?: string }).systemMessage).toBeUndefined();
});

it("hx task shows no usage warning at 91%", () => {
  const plan = path.join(proj, "docs", "sprints", "S01-plan.md");
  fs.mkdirSync(path.dirname(plan), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), plan);
  updateState("proj-teste", (s) => {
    s.activeSprint = "S01";
  });
  vi.spyOn(process, "cwd").mockReturnValue(proj);
  const out: string[] = [];
  vi.spyOn(console, "log").mockImplementation((s: string) => out.push(s));
  limits(91, 10);
  task(["start", "T01"]);
  expect(out.join("\n")).not.toContain("Uso do Claude");
});

it("config.worker has no threshold", () => {
  expect(loadConfig().worker).not.toHaveProperty("threshold");
});
