// S10/T07: near the usage limit, the Stop and hx task nudge (once per session) toward the worker skill.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { run as task } from "../src/commands/task";
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
const msg = (session: string) =>
  (
    JSON.parse(stop({ cwd: proj, session_id: session }).stdout ?? "{}") as {
      systemMessage?: string;
    }
  ).systemMessage;

it("Stop nudges at 91% (5 h), not at 89%, and only once per session", () => {
  limits(89, 10);
  expect(msg("s1")).toBeUndefined();
  limits(91, 10);
  expect(msg("s1")).toBe(
    "Uso do Claude em 91% (5 h). Delegue tarefas de escopo fechado ao trabalhador Gemini (skill worker).",
  );
  expect(msg("s1")).toBeUndefined();
  expect(msg("s2")).toContain("91% (5 h)");
});

it("weekly limit also triggers", () => {
  limits(10, 95);
  expect(msg("s1")).toContain("Uso do Claude em 95% (semana).");
});

it("hx task prints the nudge once per session", () => {
  const plan = path.join(proj, "docs", "sprints", "S01-plan.md");
  fs.mkdirSync(path.dirname(plan), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), plan);
  updateState("proj-teste", (s) => {
    s.activeSprint = "S01";
  });
  vi.spyOn(process, "cwd").mockReturnValue(proj);
  const out: string[] = [];
  vi.spyOn(console, "log").mockImplementation((s: string) => out.push(s));
  process.env.HARNESS_SESSION = "s1";
  limits(89, 10);
  task(["start", "T01"]);
  expect(out.join("\n")).not.toContain("Uso do Claude");
  limits(91, 10);
  task(["phase", "T01", "fila"]);
  expect(out.join("\n")).toContain("Uso do Claude em 91% (5 h)");
  out.length = 0;
  task(["done", "T01"]);
  expect(out.join("\n")).not.toContain("Uso do Claude");
});
