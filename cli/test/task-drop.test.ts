import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeProject, isolateHome, readEventsIn, rm, runHx } from "./helpers";

const PLAN = `# S01 — Teste

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Planejado |
|---|---|---|---|---|---|
| T01 | Primeira | clone | a.ts | — | 10 min |
| T02 | Segunda | clone | b.ts | T01 | 10 min |
| T03 | Terceira | clone | c.ts | T02 | 10 min |
| T04 | Final | clone | d.ts | T01–T03 | 10 min |

## Aprovação

- **Aprovado por:** {{nome}}
`;

describe("hx task drop|defer", () => {
  let env: ReturnType<typeof isolateHome>;
  let dir: string;
  let planFile: string;
  const hx = (...args: string[]) => runHx(args, { cwd: dir });
  const plan = () => fs.readFileSync(planFile, "utf8");

  beforeEach(() => {
    env = isolateHome();
    dir = fakeProject();
    planFile = path.join(dir, "docs", "sprints", "S01-plan.md");
    fs.mkdirSync(path.dirname(planFile), { recursive: true });
    fs.writeFileSync(planFile, PLAN);
    expect(hx("sprint", "approve", "S01").code).toBe(0);
    expect(hx("sprint", "open", "S01").code).toBe(0);
  });
  afterEach(() => {
    env.cleanup();
    rm(dir);
  });

  it("drop marks the row, rewires dependencies, logs the event and voids the approval", () => {
    const r = hx("task", "drop", "T02", "--why", "não precisa | mais");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("0/3 feitas");
    const text = plan();
    expect(text).toMatch(/^\| ~~T02~~ \| Segunda \*\*\(tirada: não precisa \\\| mais\)\*\* \|/m);
    expect(text).toMatch(/^\| T03 \| Terceira \| clone \| c\.ts \| T01 \|/m);
    expect(text).toMatch(/^\| T04 \| Final \| clone \| d\.ts \| T01, T03 \|/m);
    expect(text).not.toMatch(/`[0-9a-f]{64}`/);
    expect(text).toContain("Precisa de nova aprovação");
    const ev = readEventsIn(env.home).find((e) => e.type === "task.phase" && e.task === "T02");
    expect(ev).toMatchObject({ sprint: "S01", data: { phase: "tirada" } });

    expect(hx("sprint", "open", "S01").stderr).toContain("ainda não aprovado");
    expect(hx("sprint", "approve", "S01").code).toBe(0);
    expect(hx("sprint", "open", "S01").code).toBe(0);
  });

  it("defer marks the row as postponed", () => {
    expect(hx("task", "defer", "T04", "--why", "falta tempo").code).toBe(0);
    expect(plan()).toMatch(/^\| ~~T04~~ \| Final \*\*\(adiada: falta tempo\)\*\* \|/m);
    const ev = readEventsIn(env.home).find((e) => e.type === "task.phase" && e.task === "T04");
    expect(ev).toMatchObject({ data: { phase: "adiada" } });
  });

  it("refuses a done task, an unknown task and a missing reason", () => {
    hx("task", "start", "T01");
    hx("task", "done", "T01");
    const before = plan();
    for (const [args, msg] of [
      [["task", "drop", "T01", "--why", "x"], "já está feita"],
      [["task", "drop", "T09", "--why", "x"], "não está no plano"],
      [["task", "defer", "T03"], "--why"],
    ] as const) {
      const r = hx(...args);
      expect(r.code).toBe(1);
      expect(r.stderr).toContain(msg);
    }
    expect(plan()).toBe(before);
  });
});
