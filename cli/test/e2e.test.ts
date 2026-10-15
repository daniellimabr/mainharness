// End to end with paths that have spaces: the real plugin root ("C:\Main Harness" on Daniel's
// machine), a temp project with spaces, a temp inbox with spaces. Runs the bundled hx.js exactly
// like Claude Code does (exec form: node + args).
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateEvent } from "../src/events/schema";
import { readEventsIn, REPO_ROOT, rm, runHx, tempDir } from "./helpers";

let home: string;
let project: string;
let inbox: string;
let tools: string;
let env: Record<string, string>;

const hx = (args: string[], stdin?: unknown) => runHx(args, { cwd: project, env, stdin });

beforeAll(() => {
  home = tempDir("hx e2e home");
  project = tempDir("hx e2e Projeto Web");
  inbox = tempDir("hx e2e inbox");
  tools = tempDir("hx e2e tools");
  const fakeClaude = path.join(tools, "fake claude.js");
  fs.writeFileSync(fakeClaude, "process.exit(0);\n");
  env = {
    HARNESS_HOME: home,
    HARNESS_INBOX: inbox,
    HARNESS_CLAUDE_BIN: fakeClaude,
    CLAUDE_CONFIG_DIR: path.join(tools, "claude config"),
  };
  fs.writeFileSync(
    path.join(project, "package.json"),
    JSON.stringify({ name: "e2e", private: true, dependencies: { react: "^19.0.0" } }),
  );
  fs.writeFileSync(path.join(project, "main.ts"), "// Entry point.\nexport const x = 1;\n");
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: project });
});

afterAll(() => {
  for (const d of [home, project, inbox, tools]) rm(d);
});

describe("e2e with spaces in every path", () => {
  it("the plugin root itself has a space on Daniel's machine", () => {
    expect(fs.existsSync(path.join(REPO_ROOT, "cli", "dist", "hx.js"))).toBe(true);
    if (process.platform === "win32" && /Main Harness/i.test(REPO_ROOT)) {
      expect(REPO_ROOT).toContain(" ");
    }
  });

  it("attach connects a web project and enables the optional catalog", () => {
    const r = hx(["attach", "--no-install"]);
    expect(r.stderr).not.toMatch(/Error|erro inesperado/i);
    expect(r.code).toBe(0);
    const hj = JSON.parse(fs.readFileSync(path.join(project, ".claude", "harness.json"), "utf8"));
    expect(hj.project).toMatch(/^hx-e2e-projeto-web/);
    expect(hj.web).toBe(true);
    expect(
      fs.existsSync(path.join(project, ".claude", "skills", "webapp-testing", "SKILL.md")),
    ).toBe(true);
    expect(fs.existsSync(path.join(project, "index.md"))).toBe(true);
    const settings = JSON.parse(
      fs.readFileSync(path.join(project, ".claude", "settings.json"), "utf8"),
    );
    expect(settings.env.ENABLE_STOP_REVIEW).toBe("0");
    expect(settings.env.ENABLE_COMMIT_REVIEW).toBe("0");
    expect(settings.autoCompactWindow).toBe(250000);
  });

  it("session-start injects context and records session.start", () => {
    const r = hx(["hook", "session-start"], {
      session_id: "e2e-1",
      source: "startup",
      cwd: project,
    });
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.hookSpecificOutput.additionalContext).toMatch(/hx-e2e-projeto-web/);
  });

  it("sprint approve/open and task start/done update the plan with durations", () => {
    const plan = path.join(project, "docs", "sprints", "S01-plan.md");
    fs.copyFileSync(path.join(REPO_ROOT, "templates", "sprint-plan.md"), plan);
    expect(hx(["sprint", "approve", "S01", "--by", "Daniel"]).code).toBe(0);
    expect(hx(["sprint", "open", "S01"]).code).toBe(0);
    expect(hx(["task", "start", "T01", "--at", "2026-10-15T10:00:00Z"]).code).toBe(0);
    const done = hx(["task", "done", "T01", "--at", "2026-10-15T10:21:00Z"]);
    expect(done.code).toBe(0);
    expect(fs.readFileSync(plan, "utf8")).toMatch(/- \[x\] T01 .*\(21 min\)/);
    const ev = readEventsIn(home).find((e) => e.type === "task.done");
    expect((ev?.data as { duration_s: number }).duration_s).toBe(1260);
  });

  it("pre-bash blocks a force push", () => {
    const r = hx(["hook", "pre-bash"], {
      cwd: project,
      tool_name: "Bash",
      tool_input: { command: 'cd "C:/Dashboard IA" && git push --force origin main' },
    });
    expect(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision).toBe("deny");
  });

  it("request creates a new file in an inbox with spaces, never overwriting", () => {
    const args = [
      "request",
      "--title",
      "Evento de handoff",
      "--need",
      "x",
      "--why",
      "y",
      "--priority",
      "media",
    ];
    expect(hx(args).code).toBe(0);
    expect(hx(args).code).toBe(0);
    expect(fs.readdirSync(inbox)).toHaveLength(2);
  });

  it("every event written is valid against the schema", () => {
    const events = readEventsIn(home);
    expect(events.length).toBeGreaterThan(4);
    for (const e of events) expect(validateEvent(e)).toEqual([]);
  });
});
