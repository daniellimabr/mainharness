import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeProject, isolateHome, readEventsIn, REPO_ROOT, rm, runHx } from "./helpers";

describe("reopened task and approval replacement (B083, B082, B095, B128)", () => {
  let env: ReturnType<typeof isolateHome>;
  let dir: string;
  let plan: string;
  const hx = (...args: string[]) => runHx(args, { cwd: dir });
  const count = () => fs.readFileSync(plan, "utf8").match(/^## Aprovação/gm)?.length ?? 0;

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

  it("a task reopened by feedback accepts phase and review, and sums the passes", () => {
    hx("task", "start", "T01", "--at", "2026-10-15T02:00:00Z");
    hx("task", "done", "T01", "--at", "2026-10-15T02:10:00Z");
    expect(hx("sprint", "feedback", "1").code).toBe(0);
    const ph = hx("task", "phase", "T01", "código");
    expect(ph.code).toBe(0);
    expect(ph.stderr).toBe("");
    expect(ph.stdout).toContain("| 🔄 código | T01 |");
    expect(hx("review", "pass", "T01").code).toBe(0);
    expect(hx("review", "fail", "T01").code).toBe(0);
    expect(readEventsIn(env.home).filter((e) => e.type === "review.result")).toHaveLength(2);
    expect(hx("task", "done", "T01").code).toBe(0);
    const dones = readEventsIn(env.home).filter((e) => e.type === "task.done");
    expect(dones).toHaveLength(2);
  });

  it("a done task without feedback still rejects phase; unknown task fails", () => {
    hx("task", "start", "T01", "--at", "2026-10-15T02:00:00Z");
    hx("task", "done", "T01", "--at", "2026-10-15T02:10:00Z");
    const r = hx("task", "phase", "T01", "lint");
    expect(r.stderr).toContain("já está feita");
    expect(r.stdout).toBe("");
    const u = hx("task", "phase", "T99", "lint");
    expect(u.code).toBe(1);
    expect(u.stderr).toContain("não está no plano");
  });

  it("approve after a plan change replaces the old section (only one left)", () => {
    fs.writeFileSync(plan, fs.readFileSync(plan, "utf8").replace("Uma ou duas", "Três"));
    const r = hx("sprint", "approve", "S01");
    expect(r.code).toBe(0);
    expect(count()).toBe(1);
    expect(hx("sprint", "open", "S01").code).toBe(0);
  });

  it("approve collapses two Aprovação sections into one", () => {
    const t = fs.readFileSync(plan, "utf8");
    fs.writeFileSync(plan, `${t.replace("Uma ou duas", "Três")}\n## Aprovação\n\nsobra\n`);
    expect(hx("sprint", "approve", "S01").code).toBe(0);
    expect(count()).toBe(1);
    expect(fs.readFileSync(plan, "utf8")).not.toContain("sobra");
  });

  it("an unapproved plan says Daniel must run approve in his terminal", () => {
    const t = fs.readFileSync(plan, "utf8");
    fs.writeFileSync(plan, `${t.slice(0, t.indexOf("## Aprovação")).trimEnd()}\n`);
    const r = hx("sprint", "open", "S01");
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("terminal dele");
  });
});
