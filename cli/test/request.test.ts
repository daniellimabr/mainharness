// hx request --to <id>: writes into a registered project's inbox/; session-start there warns about it.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/request";
import { registerProject } from "../src/core/projects";
import { sessionStart } from "../src/hooks/session-start";
import { fakeProject, isolateHome, REPO_ROOT, rm, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;
let repo: string;

const base = ["--title", "Algo novo", "--need", "n", "--why", "w"];

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
  repo = tempDir("hx repo");
  process.env.HARNESS_REPO = repo;
  process.env.CLAUDE_PLUGIN_ROOT = REPO_ROOT;
  registerProject({
    id: "proj-teste",
    name: "A",
    path: proj,
    version: "0.1.0",
    attachedAt: "2026-10-15T00:00:00Z",
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.HARNESS_REPO;
  delete process.env.CLAUDE_PLUGIN_ROOT;
  env.cleanup();
  rm(proj);
  rm(repo);
});

const files = (dir: string): string[] =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];

describe("hx request --to", () => {
  it("writes into the registered project's inbox", () => {
    expect(run([...base, "--to", "proj-teste"])).toBe(0);
    expect(files(path.join(proj, "inbox"))).toHaveLength(1);
  });

  it("refuses an unknown id and writes nothing", () => {
    expect(run([...base, "--to", "nao-existe"])).toBe(1);
    expect(files(path.join(proj, "inbox"))).toHaveLength(0);
  });

  it("refuses a path in --to", () => {
    expect(run([...base, "--to", "../x"])).toBe(1);
    expect(run([...base, "--to", proj])).toBe(1);
    expect(fs.existsSync(path.join(proj, "inbox"))).toBe(false);
  });

  it("session-start in the project counts the pending requests", () => {
    run([...base, "--to", "proj-teste"]);
    run([...base, "--title", "Outro", "--to", "proj-teste"]);
    const out = sessionStart({ cwd: proj, session_id: "s1", source: "startup" });
    const ctx = (
      JSON.parse(out.stdout ?? "{}") as { hookSpecificOutput?: { additionalContext?: string } }
    ).hookSpecificOutput?.additionalContext;
    expect(ctx).toContain("Pedidos do harness no inbox/: 2.");
  });
});
