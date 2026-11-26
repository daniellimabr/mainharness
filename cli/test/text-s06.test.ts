// S06 text fix: session-start keeps `\|` in backlog items (B058).
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerProject } from "../src/core/projects";
import { sessionStart } from "../src/hooks/session-start";
import { fakeProject, isolateHome, rm, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.HARNESS_REPO;
  env.cleanup();
  rm(proj);
});

describe("session-start backlog item with escaped pipe (B058)", () => {
  it("shows the whole item text", () => {
    const repo = tempDir("hx repo");
    fs.mkdirSync(path.join(repo, "docs"));
    fs.writeFileSync(
      path.join(repo, "docs", "backlog.md"),
      "| Id | Item | Origem | Prioridade | Status |\n|---|---|---|---|---|\n" +
        "| B050 | Aceitar a \\| b no texto | inbox: 2026-10-20-proj-teste-pipe.md | alta | feito (S05) |\n",
    );
    process.env.HARNESS_REPO = repo;
    const at = "2026-10-15T00:00:00Z";
    registerProject({ id: "proj-teste", name: "A", path: proj, version: "0.1.0", attachedAt: at });
    const out = sessionStart({ cwd: proj, session_id: "s1", source: "startup" });
    const ctx = (
      JSON.parse(out.stdout ?? "{}") as { hookSpecificOutput?: { additionalContext?: string } }
    ).hookSpecificOutput?.additionalContext;
    expect(ctx).toContain("- B050 (feito (S05)): Aceitar a | b no texto");
    rm(repo);
  });
});
