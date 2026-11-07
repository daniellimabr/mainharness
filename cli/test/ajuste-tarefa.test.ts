import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeProject, isolateHome, readEventsIn, REPO_ROOT, rm, runHx } from "./helpers";

describe("ajuste vira tarefa (B140, B142, B146)", () => {
  let env: ReturnType<typeof isolateHome>;
  let dir: string;
  let plan: string;
  const hx = (...args: string[]) => runHx(args, { cwd: dir });

  beforeEach(() => {
    env = isolateHome();
    dir = fakeProject();
    plan = path.join(dir, "docs", "sprints", "S01-plan.md");
    fs.mkdirSync(path.dirname(plan), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), plan);
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01");
  });
  afterEach(() => {
    env.cleanup();
    rm(dir);
  });

  it("feedback adds the next TNN with the ajuste mark and keeps the approval valid", () => {
    const before = fs.readFileSync(plan, "utf8").match(/^\| T(\d+) \|/gm) ?? [];
    const r = hx("sprint", "feedback", "2");
    expect(r.code).toBe(0);
    const next = `T${String(before.length + 1).padStart(2, "0")}`;
    expect(r.stdout).toContain(`Tarefa ${next}`);
    expect(fs.readFileSync(plan, "utf8")).toMatch(
      new RegExp(`^\\| ${next} \\|.*\\(ajuste\\)`, "m"),
    );
    expect(hx("sprint", "open", "S01").code).toBe(0);
  });

  it("feedback 0 adds no task", () => {
    const before = fs.readFileSync(plan, "utf8");
    hx("sprint", "feedback", "0");
    expect(fs.readFileSync(plan, "utf8")).toBe(before);
  });

  it("task and review accept the TNN and 'Ajuste N', events carry the TNN", () => {
    hx("sprint", "feedback", "1");
    const id = /Tarefa (T\d+)/.exec(hx("sprint", "feedback", "1").stdout)?.[1] ?? "";
    const first = /^\| (T\d+) \|.*\(ajuste\)/m.exec(fs.readFileSync(plan, "utf8"))?.[1] ?? "";
    expect(hx("task", "start", "Ajuste 1").code).toBe(0);
    expect(hx("task", "phase", "Ajuste", "1", "fila").code).toBe(0);
    expect(hx("review", "pass", "Ajuste 1").code).toBe(0);
    expect(hx("task", "done", "Ajuste 1").code).toBe(0);
    expect(hx("task", "start", id).code).toBe(0);
    const evs = readEventsIn(env.home);
    for (const t of ["task.start", "task.phase", "review.result", "task.done"])
      expect(evs.find((e) => e.type === t)?.task).toBe(first);
    expect(evs.filter((e) => e.type === "task.start").at(-1)?.task).toBe(id);
    expect(id).not.toBe(first);
  });
});
