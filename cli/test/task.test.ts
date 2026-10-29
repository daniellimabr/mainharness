import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeProject, isolateHome, REPO_ROOT, rm, runHx } from "./helpers";

describe("hx task on a finished task", () => {
  let env: ReturnType<typeof isolateHome>;
  let dir: string;
  const hx = (...args: string[]) => runHx(args, { cwd: dir });

  beforeEach(() => {
    env = isolateHome();
    dir = fakeProject();
    const plan = path.join(dir, "docs", "sprints", "S01-plan.md");
    fs.mkdirSync(path.dirname(plan), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), plan);
    hx("sprint", "approve", "S01");
    hx("sprint", "open", "S01");
  });
  afterEach(() => {
    env.cleanup();
    rm(dir);
  });

  it("done and phase after review pass exit 0 without the 'not in progress' error", () => {
    hx("task", "start", "T01");
    hx("task", "done", "T01");
    expect(hx("review", "pass", "T01", "--agent", "reviewer").code).toBe(0);
    for (const args of [
      ["task", "phase", "T01", "fila"],
      ["task", "phase", "T01", "revisão"],
      ["task", "done", "T01"],
    ]) {
      const r = hx(...args);
      expect(r.code).toBe(0);
      expect(r.stderr).not.toContain("não está em andamento");
      expect(r.stderr).toContain("já está feita");
    }
  });
});
