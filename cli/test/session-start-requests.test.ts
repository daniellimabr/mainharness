// session-start shows, once, the project's harness requests marked `feito (SNN)` in the harness backlog.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerProject } from "../src/core/projects";
import { harnessVersion } from "../src/core/version";
import { sessionStart } from "../src/hooks/session-start";
import { fakeProject, isolateHome, rm, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;
let repo: string;

const BACKLOG = `# Backlog

| Id | Item | Origem | Prioridade | Status |
|---|---|---|---|---|
| B050 | Mostrar status no painel | inbox: 2026-10-20-proj-teste-status-painel.md | alta | feito (S05) |
| B051 | Pedido do outro projeto | inbox: 2026-10-20-proj-teste-b-outro.md | alta | feito (S05) |
| B052 | Ainda aberto | inbox: 2026-10-20-proj-teste-aberto.md | alta | aberto |
| B053 | Melhoria interna | retro | média | feito (S05) |
`;

function context(): string {
  const out = sessionStart({ cwd: proj, session_id: "s1", source: "startup" });
  const json = JSON.parse(out.stdout ?? "{}") as {
    hookSpecificOutput?: { additionalContext?: string };
  };
  return json.hookSpecificOutput?.additionalContext ?? "";
}

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
  repo = tempDir("hx repo");
  fs.mkdirSync(path.join(repo, "docs"));
  fs.writeFileSync(path.join(repo, "docs", "backlog.md"), BACKLOG);
  process.env.HARNESS_REPO = repo;
  const at = "2026-10-15T00:00:00Z";
  registerProject({ id: "proj-teste", name: "A", path: proj, version: "0.1.0", attachedAt: at });
  registerProject({ id: "proj-teste-b", name: "B", path: repo, version: "0.1.0", attachedAt: at });
});
afterEach(() => {
  delete process.env.HARNESS_REPO;
  env.cleanup();
  rm(proj);
  rm(repo);
});

describe("session-start: requests done in the harness", () => {
  it("shows only this project's done requests, with the harness version, only once", () => {
    const first = context();
    expect(first).toContain("B050");
    expect(first).toContain("Mostrar status no painel");
    expect(first).toContain(harnessVersion());
    expect(first).not.toContain("B051");
    expect(first).not.toContain("B052");
    expect(first).not.toContain("B053");
    expect(context()).not.toContain("B050");
  });

  it("keeps the 10 newest when there are more", () => {
    const rows = Array.from(
      { length: 12 },
      (_, i) =>
        `| B${100 + i} | Item ${i} | inbox: 2026-10-20-proj-teste-x${i}.md | alta | feito (S0${1 + (i % 5)}) |`,
    );
    fs.writeFileSync(path.join(repo, "docs", "backlog.md"), `${BACKLOG}${rows.join("\n")}\n`);
    const out = context();
    expect(out).not.toContain("B050");
    expect(out).not.toContain("B100");
    expect(out).toContain("B111");
  });

  it("is silent without a backlog", () => {
    fs.rmSync(path.join(repo, "docs", "backlog.md"));
    expect(context()).not.toContain("Pedidos");
  });
});
