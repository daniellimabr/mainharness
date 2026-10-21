// Tests for hx eval: change scope, release gate, stream parsing, pool limit, fake-claude end to end.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evalSkill, needsFixtures, parseStream, pool } from "../src/eval/run";
import { git } from "../src/release/git";
import { checkSkills, evalScope, stampSkill } from "../src/release/skills";
import { isolateHome, readEventsIn, rm, tempDir } from "./helpers";

let repo: string;
let iso: ReturnType<typeof isolateHome>;
let fake: string;

const MD = (desc: string, body: string) => `---\nname: adr\ndescription: ${desc}\n---\n${body}\n`;

function write(rel: string, content: string): void {
  const f = path.join(repo, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

function commit(msg: string): void {
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", msg]);
}

// Fake `claude -p`: stream-json lines. Triggers the sandbox skill when the prompt has "TRIGGER";
// answers as judge (FAKE_JUDGE) when the prompt is a grading prompt.
const FAKE = `
const fs = require("fs"), path = require("path");
let p = ""; process.stdin.on("data", d => p += d).on("end", () => {
  const out = [];
  if (p.includes("TRIGGER")) {
    const dir = path.join(process.cwd(), ".claude", "skills");
    const name = fs.existsSync(dir) ? fs.readdirSync(dir)[0] : "none";
    out.push({ type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: { skill: name } }] } });
  }
  const judge = p.includes("grading skill eval runs");
  if (!judge && process.argv.includes("acceptEdits")) fs.writeFileSync("out.md", "# ADR\\nDecisão: X");
  out.push({ type: "result", result: judge ? process.env.FAKE_JUDGE : "ok fixture=" + fs.existsSync("docs/adr/0003-x.md") + " hx=" + process.argv.includes("Bash(hx:*)") + " home=" + (process.env.HARNESS_HOME || "").startsWith(process.cwd()) + " leak=" + ["HARNESS_REPO", "HARNESS_STABLE_DIR", "HARNESS_INBOX"].some(k => k in process.env), session_id: "s-" + process.pid,
    total_cost_usd: 0.01, usage: { input_tokens: 10, output_tokens: 5 },
    modelUsage: { "claude-sonnet-4-5": { inputTokens: 10, outputTokens: 5, cacheReadInputTokens: 2, cacheCreationInputTokens: 1, costUSD: 0.01 } } });
  process.stdout.write(out.map(o => JSON.stringify(o)).join("\\n") + "\\n");
});`;

beforeEach(() => {
  iso = isolateHome();
  repo = tempDir("hx eval repo");
  git(repo, ["init", "-q", "-b", "main"]);
  git(repo, ["config", "user.email", "t@t"]);
  git(repo, ["config", "user.name", "t"]);
  write("skills/adr/SKILL.md", MD("old", "body"));
  write("skills/adr/ref.md", "ref");
  commit("init");
  git(repo, ["tag", "v0.1.0"]);
  fake = path.join(iso.home, "fake claude.js");
  fs.writeFileSync(fake, FAKE);
  process.env.HX_CLAUDE_BIN = `"${process.execPath}" "${fake}"`;
});

afterEach(() => {
  delete process.env.HX_CLAUDE_BIN;
  delete process.env.FAKE_JUDGE;
  iso.cleanup();
  rm(repo);
});

describe("evalScope", () => {
  it("description change -> trigger only", () => {
    write("skills/adr/SKILL.md", MD("new", "body"));
    expect(evalScope(repo, "skills/adr", "v0.1.0")).toEqual({
      trigger: true,
      evals: false,
      isNew: false,
    });
  });
  it("body or other file change -> cases only", () => {
    write("skills/adr/SKILL.md", MD("old", "body 2"));
    expect(evalScope(repo, "skills/adr", "v0.1.0")).toMatchObject({ trigger: false, evals: true });
    write("skills/adr/SKILL.md", MD("old", "body"));
    write("skills/adr/ref.md", "ref 2");
    expect(evalScope(repo, "skills/adr", "v0.1.0")).toMatchObject({ trigger: false, evals: true });
  });
  it("evals/ only -> nothing; CRLF is not a change", () => {
    write("skills/adr/evals/evals.json", "{}");
    write("skills/adr/SKILL.md", MD("old", "body").replace(/\n/g, "\r\n"));
    expect(evalScope(repo, "skills/adr", "v0.1.0")).toMatchObject({ trigger: false, evals: false });
  });
  it("new skill (or no tag) -> both", () => {
    write("skills/prd/SKILL.md", MD("p", "b"));
    expect(evalScope(repo, "skills/prd", "v0.1.0")).toEqual({
      trigger: true,
      evals: true,
      isNew: true,
    });
    expect(evalScope(repo, "skills/adr", null).isNew).toBe(true);
  });
});

describe("checkSkills gate", () => {
  it("requires the block the scope demands", () => {
    write("skills/adr/SKILL.md", MD("new", "body"));
    stampSkill(repo, "skills/adr", { passed: true, evals: { passed: 3, total: 3 } });
    expect(checkSkills(repo, ["skills/adr"])[0]?.ok).toBe(false);
    stampSkill(repo, "skills/adr", { passed: true, trigger: { passed: 8, total: 8 } });
    expect(checkSkills(repo, ["skills/adr"])[0]).toMatchObject({ ok: true });
  });
  it("refuses failed or stale results", () => {
    write("skills/adr/SKILL.md", MD("old", "body 2"));
    stampSkill(repo, "skills/adr", { passed: false, evals: { passed: 2, total: 3 } });
    expect(checkSkills(repo, ["skills/adr"])[0]?.ok).toBe(false);
    stampSkill(repo, "skills/adr", { passed: true, evals: { passed: 3, total: 3 } });
    write("skills/adr/ref.md", "changed later");
    expect(checkSkills(repo, ["skills/adr"])[0]?.reason).toMatch(/mudou/);
  });
});

describe("parseStream / pool", () => {
  it("reads Skill calls, answer and usage per model", () => {
    const out = [
      '{"type":"system"}',
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"adr"}}]}}',
      '{"type":"result","result":"done","session_id":"abc","total_cost_usd":0.5,"usage":{"input_tokens":3}}',
      "not json",
    ].join("\n");
    const s = parseStream(out);
    expect(s).toMatchObject({ text: "done", skills: ["adr"], sessionId: "abc" });
    expect(s.usage).toEqual([
      { model: "sonnet", input: 3, output: 0, cache_write: 0, cache_read: 0, usd: 0.5 },
    ]);
  });
  it("answer keeps text written before tool calls, not only the final message", () => {
    const out = [
      '{"type":"assistant","message":{"content":[{"type":"text","text":"plan"},{"type":"tool_use","name":"Write","input":{}}]}}',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"done"}]}}',
      '{"type":"result","result":"done","session_id":"abc"}',
    ].join("\n");
    expect(parseStream(out)).toMatchObject({ text: "done", answer: "plan\n\ndone" });
  });
  it("answer includes the prompt delegated to a subagent", () => {
    const out = [
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Agent","input":{"prompt":"# Handoff T05"}}]}}',
      '{"type":"result","result":"ok","session_id":"abc"}',
    ].join("\n");
    expect(parseStream(out).answer).toBe("[prompt enviado ao subagente]\n# Handoff T05");
  });
  it("never runs more than the limit at once", async () => {
    let now = 0;
    let max = 0;
    const r = await pool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      max = Math.max(max, ++now);
      await new Promise((ok) => setTimeout(ok, 10));
      now--;
      return n * 2;
    });
    expect(max).toBe(3);
    expect(r).toEqual([2, 4, 6, 8, 10, 12, 14]);
  });
});

describe("evalSkill (fake claude)", () => {
  const ctx = { project: "main-harness", session: null, sprint: "S01" };

  it("trigger only: grades queries, keeps old cases block, emits usage", async () => {
    write("skills/adr/SKILL.md", MD("new", "body"));
    stampSkill(repo, "skills/adr", { passed: true, evals: { passed: 3, total: 3 } });
    write(
      "skills/adr/evals/trigger.json",
      JSON.stringify([
        { query: "TRIGGER registre a decisão", should_trigger: true },
        { query: "que horas são", should_trigger: false },
      ]),
    );
    const res = await evalSkill(repo, "skills/adr", evalScope(repo, "skills/adr", "v0.1.0"), ctx);
    expect(res).toMatchObject({
      passed: true,
      trigger: { passed: 2, total: 2 },
      evals: { passed: 3, total: 3 },
    });
    const tr = JSON.parse(
      fs.readFileSync(path.join(repo, "skills/adr/evals/trigger-results.json"), "utf8"),
    ) as { results: { triggered: boolean }[] };
    expect(tr.results.map((r) => r.triggered)).toEqual([true, false]);
    expect(checkSkills(repo, ["skills/adr"])[0]?.ok).toBe(true);
    const usage = readEventsIn(iso.home).filter((e) => e.type === "usage");
    expect(usage).toHaveLength(2);
    expect(usage[0]).toMatchObject({
      agent: "eval",
      sprint: "S01",
      project: "main-harness",
      data: { model: "claude-sonnet-4-5", input: 10, output: 5, cache_read: 2, cache_write: 1 },
    });
  });

  it("new skill: cases with skill + baseline, one judge session", async () => {
    write("skills/prd/SKILL.md", MD("p", "b"));
    write(
      "skills/prd/evals/trigger.json",
      JSON.stringify([{ query: "TRIGGER prd", should_trigger: true }]),
    );
    write(
      "skills/prd/evals/evals.json",
      JSON.stringify({
        skill_name: "prd",
        evals: [{ id: 1, prompt: "escreva", expected_output: "x", expectations: ["tem Decisão"] }],
      }),
    );
    process.env.FAKE_JUDGE = JSON.stringify({
      results: [
        { id: "1", passed: true, failed: [] },
        { id: "baseline-1", passed: false, failed: ["tem Decisão"] },
      ],
    });
    const res = await evalSkill(repo, "skills/prd", evalScope(repo, "skills/prd", "v0.1.0"), ctx);
    expect(res).toMatchObject({
      passed: true,
      trigger: { passed: 1, total: 1 },
      evals: { passed: 1, total: 1 },
    });
    expect(res.notes).toMatch(/baseline sem skill: 0\/1/);
    // 1 trigger + 1 case + 1 baseline + 1 judge
    expect(readEventsIn(iso.home).filter((e) => e.type === "usage")).toHaveLength(4);
    expect(checkSkills(repo, ["skills/prd"])[0]?.ok).toBe(true);
  });

  it("copies case fixtures from evals/files/ to the sandbox root; long temp path", async () => {
    write("skills/adr/SKILL.md", MD("old", "body 3"));
    write("skills/adr/evals/files-v2/docs/adr/0003-x.md", "# ADR 0003");
    write(
      "skills/adr/evals/evals.json",
      JSON.stringify({
        skill_name: "adr",
        evals: [
          { id: 1, prompt: "p", expectations: ["y"], files: ["files-v2/docs/adr/0003-x.md"] },
        ],
      }),
    );
    process.env.FAKE_JUDGE = JSON.stringify({ results: [{ id: "1", passed: true }] });
    const keys = ["HARNESS_REPO", "HARNESS_STABLE_DIR", "HARNESS_INBOX"];
    for (const k of keys) process.env[k] = "C:/real";
    try {
      await evalSkill(repo, "skills/adr", evalScope(repo, "skills/adr", "v0.1.0"), ctx);
    } finally {
      for (const k of keys) Reflect.deleteProperty(process.env, k);
    }
    const cases = fs.readFileSync(path.join(repo, "skills/adr/evals/cases-results.json"), "utf8");
    expect(cases).toContain("ok fixture=true hx=true home=true leak=false");
    expect(cases).not.toMatch(/~1/);
  });

  it("warns (without failing) on a case that assumes a connected repo but has no files", async () => {
    write("skills/adr/SKILL.md", MD("old", "body 4"));
    write(
      "skills/adr/evals/evals.json",
      JSON.stringify({
        evals: [
          { id: 1, prompt: "feche a sprint S05", expectations: ["y"] },
          { id: 2, prompt: "registre a decisão", expectations: ["y"] },
        ],
      }),
    );
    process.env.FAKE_JUDGE = JSON.stringify({
      results: [
        { id: "1", passed: true },
        { id: "2", passed: true },
      ],
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await evalSkill(repo, "skills/adr", evalScope(repo, "skills/adr", "v0.1.0"), ctx);
    const msgs = warn.mock.calls.map((c) => String(c[0]));
    warn.mockRestore();
    expect(res.passed).toBe(true);
    expect(msgs.filter((m) => /sem files/.test(m))).toEqual([expect.stringMatching(/caso 1\b/)]);
  });

  it("missing judge verdict fails the case", async () => {
    write("skills/adr/SKILL.md", MD("old", "body 2"));
    write(
      "skills/adr/evals/evals.json",
      JSON.stringify({
        skill_name: "adr",
        evals: [{ id: 1, prompt: "p", expected_output: "x", expectations: ["y"] }],
      }),
    );
    process.env.FAKE_JUDGE = "não sei";
    const res = await evalSkill(repo, "skills/adr", evalScope(repo, "skills/adr", "v0.1.0"), ctx);
    expect(res).toMatchObject({ passed: false, evals: { passed: 0, total: 1 } });
  });

  describe("--failed", () => {
    const usage = () => readEventsIn(iso.home).filter((e) => e.type === "usage").length;
    const judge = (fail3: boolean) =>
      (process.env.FAKE_JUDGE = JSON.stringify({
        results: ["1", "2", "3"].map((id) => ({ id, passed: !(fail3 && id === "3") })),
      }));
    const run = (failed: boolean) =>
      evalSkill(repo, "skills/adr", evalScope(repo, "skills/adr", "v0.1.0"), ctx, { failed });

    beforeEach(async () => {
      write("skills/adr/SKILL.md", MD("new", "body 2"));
      write(
        "skills/adr/evals/trigger.json",
        JSON.stringify([
          { query: "TRIGGER a", should_trigger: true },
          { query: "b", should_trigger: true },
        ]),
      );
      write(
        "skills/adr/evals/evals.json",
        JSON.stringify({
          evals: [1, 2, 3].map((id) => ({ id, prompt: `p${id}`, expectations: ["y"] })),
        }),
      );
      judge(true);
      await run(false); // 2 trigger + 3 cases + 1 judge
    });

    it("reruns only failed cases and queries, merges with the passed ones", async () => {
      expect(usage()).toBe(6);
      judge(false);
      const res = await run(true);
      expect(usage()).toBe(6 + 3); // 1 query + 1 case + 1 judge
      expect(res).toMatchObject({
        trigger: { passed: 1, total: 2 },
        evals: { passed: 3, total: 3 },
      });
      const cases = JSON.parse(
        fs.readFileSync(path.join(repo, "skills/adr/evals/cases-results.json"), "utf8"),
      ) as { runs: { id: string; passed: boolean }[] };
      expect(cases.runs.map((r) => [r.id, r.passed])).toEqual([
        ["1", true],
        ["2", true],
        ["3", true],
      ]);
      const tr = JSON.parse(
        fs.readFileSync(path.join(repo, "skills/adr/evals/trigger-results.json"), "utf8"),
      ) as { results: { query: string }[] };
      expect(tr.results.map((r) => r.query)).toEqual(["TRIGGER a", "b"]);
    });

    it("skill changed since last run -> runs everything and warns", async () => {
      write("skills/adr/ref.md", "ref 2");
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      await run(true);
      expect(warn).toHaveBeenCalledWith("skill mudou desde a última rodada: rodando tudo");
      warn.mockRestore();
      expect(usage()).toBe(12);
    });
  });
});

describe("needsFixtures", () => {
  it.each([
    ["feche a sprint", true],
    ["planeje a S07", true],
    ["escreva o Release Report", true],
    ["no repo conectado, rode", true],
    ["rode hx status", true],
    ["registre a decisão sobre o banco", false],
    ["escreva um PRD de login", false],
  ])("%s -> %s", (prompt, want) => {
    expect(needsFixtures({ prompt })).toBe(want);
    expect(needsFixtures({ prompt, files: ["files/x.md"] })).toBe(false);
  });
});
