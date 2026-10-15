import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateEvent } from "../src/events/schema";
import { classifyCommand, splitCommand } from "../src/hooks/pre-bash";
import { fakeProject, isolateHome, readEventsIn, REPO_ROOT, rm, runHx, tempDir } from "./helpers";

const ROOT = path.join(os.tmpdir(), "Meu Projeto");
const STABLE = "C:\\harness-stable";
const HOME = os.homedir();

describe("splitCommand", () => {
  it("splits by operators and keeps quoted words", () => {
    const s = splitCommand(
      `cd "C:\\Dashboard IA" && echo 'a; b' > "out file.txt"; ls | wc -l 2>&1`,
    );
    expect(s.map((x) => x.words)).toEqual([
      ["cd", "C:\\Dashboard IA"],
      ["echo", "a; b"],
      ["ls"],
      ["wc", "-l"],
    ]);
    expect(s[1]?.redirects).toEqual(["out file.txt"]);
  });
});

describe("classifyCommand", () => {
  const D = "deny";
  const A = "ask";
  const N = null;
  const table: [string, "deny" | "ask" | null][] = [
    // force push
    ["git push --force", D],
    ["git push -f origin main", D],
    ["git push origin main --force-with-lease", D],
    ["git push origin +main", D],
    ["git push -uf origin feature", D],
    ["npm test && git push --force origin main", D],
    ['git -C "C:\\Dashboard IA" push -f', D],
    ["git push origin main", N],
    ["git push origin HEAD:main", N],
    ["git push origin feature/x", A],
    ["git push -u origin feature/x", A],
    ["git push origin main:release", A],
    ["git push --all", A],
    // recursive delete
    ["rm -rf node_modules", N],
    ['rm -rf "dist folder"', N],
    ["rm -r ./build ./coverage", N],
    ["rm -rf ..", D],
    ["rm -rf ../outro", D],
    ["rm -rf ~", D],
    ["rm -rf ~/projetos", D],
    ["rm -rf $HOME", D],
    ['rm -rf "$HOME/x"', D],
    ["rm -rf /", D],
    ["rm -rf /c/Users", D],
    ["rm -rf C:\\", D],
    ["rm -rf .git", D],
    ["rm -rf .git/hooks", D],
    ["rm -rf .", D],
    ["rm -rf $SOME_VAR", A],
    ["rm file.txt", N],
    ["rm -f ../a.txt", N],
    ["Remove-Item -Recurse -Force C:\\Users\\x", D],
    ["Remove-Item -Path '.\\dist' -Recurse -Force", N],
    ["Remove-Item $env:USERPROFILE -Recurse", D],
    ["ri -r ..\\..", D],
    ["rm -Force .\\file.txt", N],
    ["rmdir /s /q C:\\Windows", D],
    ["rd /S /Q build", N],
    ["del /s /q %USERPROFILE%\\Documents", D],
    ["cmd /c rmdir /s /q C:\\", D],
    ['bash -c "rm -rf /"', D],
    ['cd .. && rm -rf "Meu Projeto"', D],
    ["cd sub; rm -rf ../dist", N],
    // branches and disks
    ["git branch -D main", D],
    ["git branch -D master", D],
    ["git branch -D feature", N],
    ["git branch -d main", N],
    ["format D:", D],
    ["mkfs.ext4 /dev/sda1", D],
    ["dd if=/dev/zero of=/dev/sda bs=1M", D],
    ["dd if=a.img of=b.img", N],
    // harness-stable
    ["git -C C:\\harness-stable commit -m x", D],
    ['git -C "C:/harness-stable" reset --hard', D],
    ["cd C:\\harness-stable && git pull", D],
    ["cd /c/harness-stable && git checkout v0.1.0", D],
    ["echo x > C:\\harness-stable\\a.txt", D],
    ['echo "x" >> "C:\\harness-stable\\b c.txt"', D],
    ["cp a.txt C:\\harness-stable\\", D],
    ["Set-Content -Path C:\\harness-stable\\x.json -Value 1", D],
    ["git -C C:\\harness-stable log --oneline", N],
    ["ls C:\\harness-stable", N],
    ["cat C:\\harness-stable\\index.md | head -5", N],
    ["cp C:\\harness-stable\\a.txt .\\a.txt", N],
    ['node "C:\\harness-stable\\cli\\dist\\hx.js" release patch', N],
    // ask
    ["git reset --hard", A],
    ["git reset --hard HEAD~1 && npm test", A],
    ["git reset --soft HEAD~1", N],
    ["git clean -fd", A],
    ["git clean -xdf", A],
    ["git clean -n", N],
    ["git checkout -- .", A],
    ["git checkout .", A],
    ["git checkout -b nova", N],
    ["git restore .", A],
    ["git restore src/a.ts", N],
    ["git rebase main", A],
    ["git rebase -i HEAD~3", A],
    // normal
    ["npm test", N],
    ["git status && git diff", N],
    ['git commit -m "fix: rm -rf / no texto"', N],
    ["echo 'git push --force'", N],
    ["ls -la | grep x; echo ok", N],
  ];
  it.each(table)("%s -> %s", (cmd, want) => {
    const v = classifyCommand(cmd, ROOT, ROOT, STABLE);
    expect(v?.decision ?? null).toBe(want);
    if (v) expect(v.reason.length).toBeGreaterThan(5);
  });

  it("asks when pushing the current branch that is not main", () => {
    const dir = tempDir("hx git");
    try {
      fs.mkdirSync(path.join(dir, ".git"));
      fs.writeFileSync(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feature\n");
      expect(classifyCommand("git push", dir, dir, STABLE)?.decision).toBe("ask");
      fs.writeFileSync(path.join(dir, ".git", "HEAD"), "ref: refs/heads/main\n");
      expect(classifyCommand("git push", dir, dir, STABLE)).toBeNull();
    } finally {
      rm(dir);
    }
  });

  it("treats the home folder as outside the project", () => {
    expect(classifyCommand(`rm -rf "${HOME}"`, ROOT, ROOT, STABLE)?.decision).toBe("deny");
  });
});

// ---------- integration: the real bundle ----------

let env: ReturnType<typeof isolateHome>;
let proj: string;
const LIMITS = { HARNESS_CONTEXT_LIMIT: "1000", HARNESS_HANDOFF_AT: "900" };

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
});
afterEach(() => {
  env.cleanup();
  rm(proj);
});

function events(): Record<string, unknown>[] {
  const evs = readEventsIn(env.home);
  for (const e of evs) expect(validateEvent(e)).toEqual([]);
  return evs;
}

function stateFile(): string {
  return path.join(env.home, "state", "proj-teste.json");
}
function readStateJson(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(stateFile(), "utf8")) as Record<string, unknown>;
}
function writeStateJson(s: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
  fs.writeFileSync(stateFile(), JSON.stringify(s));
}

function transcript(tokens: number): string {
  const file = path.join(proj, "sess-1.jsonl");
  const line = (id: string, input: number) =>
    JSON.stringify({
      type: "assistant",
      sessionId: "sess-1",
      timestamp: "2026-10-15T10:00:00.000Z",
      message: {
        id,
        model: "claude-opus-5-5",
        usage: { input_tokens: input, output_tokens: 10, cache_read_input_tokens: 0 },
      },
    });
  fs.writeFileSync(file, `${line("msg_1", 100)}\n${line("msg_2", tokens)}\n`);
  return file;
}

function writeHandoff(): string {
  const dir = path.join(env.home, "handoffs", "proj-teste");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "20261015-100000.md");
  fs.writeFileSync(file, "# Handoff\n\nTarefa atual: T04 hooks.\n");
  return file;
}

describe("hook pre-bash (bundle)", () => {
  it("denies with JSON and passes normal commands silently", () => {
    const deny = runHx(["hook", "pre-bash"], {
      cwd: proj,
      stdin: { tool_name: "Bash", tool_input: { command: "git push --force" }, cwd: proj },
    });
    expect(deny.code).toBe(0);
    const out = JSON.parse(deny.stdout) as { hookSpecificOutput: Record<string, string> };
    expect(out.hookSpecificOutput.hookEventName).toBe("PreToolUse");
    expect(out.hookSpecificOutput.permissionDecision).toBe("deny");
    const ok = runHx(["hook", "pre-bash"], {
      cwd: proj,
      stdin: { tool_name: "Bash", tool_input: { command: "npm test" }, cwd: proj },
    });
    expect(ok).toMatchObject({ code: 0, stdout: "" });
  });

  it("never breaks on garbage input", () => {
    expect(runHx(["hook", "pre-bash"], { cwd: proj, stdin: "{not json" }).code).toBe(0);
  });
});

describe("hook session-start (bundle)", () => {
  it("does nothing outside an attached project", () => {
    const dir = tempDir();
    try {
      const r = runHx(["hook", "session-start"], {
        cwd: dir,
        stdin: { source: "startup", cwd: dir },
      });
      expect(r).toMatchObject({ code: 0, stdout: "" });
    } finally {
      rm(dir);
    }
  });

  it("injects project, index summary, sprint and migrates on version change", () => {
    fs.writeFileSync(
      path.join(proj, "index.md"),
      "# Mapa\n\n## Arquivos\n\n- `a.ts` — a\n- `b.ts` — b\n\n## Notas\n\nx\n",
    );
    writeStateJson({ activeSprint: "S01", session: null, tasks: {} });
    const hjFile = path.join(proj, ".claude", "harness.json");
    const hj = JSON.parse(fs.readFileSync(hjFile, "utf8")) as Record<string, unknown>;
    fs.writeFileSync(hjFile, JSON.stringify({ ...hj, version: "0.0.1" })); // older than the plugin
    const r = runHx(["hook", "session-start"], {
      cwd: proj,
      stdin: { source: "startup", session_id: "sess-1", model: "claude-opus-5-5", cwd: proj },
    });
    expect(r.code).toBe(0);
    const ctx = (JSON.parse(r.stdout) as { hookSpecificOutput: Record<string, string> })
      .hookSpecificOutput;
    expect(ctx.hookEventName).toBe("SessionStart");
    expect(ctx.additionalContext).toContain("proj-teste");
    expect(ctx.additionalContext).toContain("2 arquivos");
    expect(ctx.additionalContext).toContain("Arquivos; Notas");
    expect(ctx.additionalContext).toContain("S01");
    expect(ctx.additionalContext).toMatch(/Migração do harness/);
    expect(readStateJson().session).toBe("sess-1");
    const start = events().find((e) => e.type === "session.start");
    expect(start).toMatchObject({
      session: "sess-1",
      sprint: "S01",
      data: { source: "startup", model: "claude-opus-5-5" },
    });
  });

  it("reinjects the handoff after compact and marks it consumed", () => {
    const file = writeHandoff();
    writeStateJson({
      activeSprint: null,
      session: "sess-1",
      tasks: {},
      lastHandoff: { file, at: "2026-10-15T10:00:00Z", consumed: false },
    });
    const r = runHx(["hook", "session-start"], {
      cwd: proj,
      stdin: { source: "compact", session_id: "sess-1", cwd: proj },
    });
    const ctx = (JSON.parse(r.stdout) as { hookSpecificOutput: Record<string, string> })
      .hookSpecificOutput.additionalContext;
    expect(ctx).toContain("Tarefa atual: T04 hooks.");
    expect(ctx).toContain("Continue a sprint a partir deste handoff.");
    expect(readStateJson().lastHandoff).toMatchObject({ consumed: true });
    // a second compact does not reinject a consumed handoff
    const again = runHx(["hook", "session-start"], {
      cwd: proj,
      stdin: { source: "compact", session_id: "sess-1", cwd: proj },
    });
    expect(again.stdout).not.toContain("Tarefa atual");
  });

  it("injects a pending handoff on startup without consuming it", () => {
    const file = writeHandoff();
    writeStateJson({
      activeSprint: null,
      session: null,
      tasks: {},
      lastHandoff: { file, at: "2026-10-15T10:00:00Z" },
    });
    const r = runHx(["hook", "session-start"], {
      cwd: proj,
      stdin: { source: "startup", session_id: "sess-2", cwd: proj },
    });
    expect(r.stdout).toContain("Tarefa atual");
    expect(readStateJson().lastHandoff).not.toMatchObject({ consumed: true });
  });
});

describe("hook stop / pre-compact / session-end (bundle)", () => {
  it("blocks once above the handoff threshold, then not again in the same cycle", () => {
    const tp = transcript(950);
    const stdin = { session_id: "sess-1", transcript_path: tp, cwd: proj, stop_hook_active: false };
    const r = runHx(["hook", "stop"], { cwd: proj, stdin, env: LIMITS });
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout) as Record<string, string>;
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("hx handoff");
    expect(out.reason).toContain("limite 1 mil");
    expect(out.systemMessage).toContain("Contexto perto do limite");
    const evs = events();
    expect(evs.filter((e) => e.type === "usage")).toHaveLength(2);
    expect(evs.find((e) => e.type === "alert.context")).toMatchObject({
      data: { tokens: 950, limit: 1000, handoff: false },
    });
    expect(readStateJson().lastContextAlertAt).toBeTruthy();

    const active = runHx(["hook", "stop"], {
      cwd: proj,
      stdin: { ...stdin, stop_hook_active: true },
      env: LIMITS,
    });
    expect(active).toMatchObject({ code: 0, stdout: "" });
    const again = runHx(["hook", "stop"], { cwd: proj, stdin, env: LIMITS });
    expect(again.stdout).toBe("");
    expect(events().filter((e) => e.type === "alert.context")).toHaveLength(1);
  });

  it("stays quiet below the threshold and outside projects", () => {
    const tp = transcript(500);
    const r = runHx(["hook", "stop"], {
      cwd: proj,
      stdin: { session_id: "sess-1", transcript_path: tp, cwd: proj },
      env: LIMITS,
    });
    expect(r).toMatchObject({ code: 0, stdout: "" });
    const dir = tempDir();
    try {
      expect(runHx(["hook", "stop"], { cwd: dir, stdin: { cwd: dir } }).stdout).toBe("");
    } finally {
      rm(dir);
    }
  });

  it("pre-compact records the handoff and opens a new alert cycle", () => {
    const tp = transcript(950);
    const stdin = { session_id: "sess-1", transcript_path: tp, cwd: proj };
    runHx(["hook", "stop"], { cwd: proj, stdin, env: LIMITS });
    const file = writeHandoff();
    const st = readStateJson();
    st.lastHandoff = { file, at: new Date().toISOString().replace(/\.\d+Z$/, "Z") };
    writeStateJson(st);

    const r = runHx(["hook", "pre-compact"], {
      cwd: proj,
      stdin: { ...stdin, trigger: "auto" },
      env: LIMITS,
    });
    expect(r.code).toBe(0);
    expect(events().find((e) => e.type === "handoff")).toMatchObject({
      data: { mode: "compact", file: "20261015-100000.md" },
    });
    expect(readStateJson().lastCompactAt).toBeTruthy();

    const back = runHx(["hook", "session-start"], {
      cwd: proj,
      stdin: { source: "compact", session_id: "sess-1", cwd: proj },
    });
    expect(back.stdout).toContain("Tarefa atual");

    // after compaction a new alert is allowed again
    const next = runHx(["hook", "stop"], { cwd: proj, stdin, env: LIMITS });
    expect((JSON.parse(next.stdout) as Record<string, string>).decision).toBe("block");
  });

  it("pre-compact without a handoff records alert + handoff(file null)", () => {
    const tp = transcript(990);
    runHx(["hook", "pre-compact"], {
      cwd: proj,
      stdin: { session_id: "sess-1", transcript_path: tp, cwd: proj, trigger: "auto" },
      env: LIMITS,
    });
    const evs = events();
    expect(evs.find((e) => e.type === "alert.context")).toMatchObject({
      data: { tokens: 990, limit: 1000, handoff: false },
    });
    expect(evs.find((e) => e.type === "handoff")).toMatchObject({
      data: { mode: "compact", file: null },
    });
  });

  it("subagent-stop ingests usage; session-end records the end", () => {
    const tp = transcript(10);
    const stdin = { session_id: "sess-1", transcript_path: tp, cwd: proj };
    expect(runHx(["hook", "subagent-stop"], { cwd: proj, stdin })).toMatchObject({
      code: 0,
      stdout: "",
    });
    expect(events().filter((e) => e.type === "usage")).toHaveLength(2);
    runHx(["hook", "session-end"], { cwd: proj, stdin: { ...stdin, reason: "logout" } });
    expect(events().find((e) => e.type === "session.end")).toMatchObject({
      session: "sess-1",
      data: { reason: "logout" },
    });
  });
});

describe("hook post-edit (bundle)", () => {
  let lintProj: string;
  beforeEach(() => {
    lintProj = tempDir("hx lint proj");
    fs.symlinkSync(
      path.join(REPO_ROOT, "node_modules"),
      path.join(lintProj, "node_modules"),
      "junction",
    );
    fs.writeFileSync(path.join(lintProj, "package.json"), '{ "name": "lint-proj" }\n');
    fs.writeFileSync(
      path.join(lintProj, "eslint.config.js"),
      'const tseslint = require("typescript-eslint");\n' +
        'module.exports = [{ files: ["**/*.ts"], languageOptions: { parser: tseslint.parser },' +
        ' rules: { "no-unused-vars": "error" } }];\n',
    );
    fs.writeFileSync(
      path.join(lintProj, "index.md"),
      "# Mapa do repo\n\n## Arquivos\n\n- `package.json` — pacote\n",
    );
    fs.mkdirSync(path.join(lintProj, "src dir"));
  });
  afterEach(() => {
    fs.unlinkSync(path.join(lintProj, "node_modules"));
    rm(lintProj);
  });

  const edit = (file: string) =>
    runHx(["hook", "post-edit"], {
      cwd: lintProj,
      stdin: { tool_name: "Write", tool_input: { file_path: file }, cwd: lintProj },
    });

  it("returns exit 2 with compact lint errors and still updates index.md", () => {
    const file = path.join(lintProj, "src dir", "bad.ts");
    fs.writeFileSync(file, "// Bad file.\nconst unused = 1;\n");
    const r = edit(file);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/src dir\/bad\.ts:2:7 no-unused-vars /);
    expect(r.stderr).toContain("Corrija antes de seguir.");
    expect(fs.readFileSync(path.join(lintProj, "index.md"), "utf8")).toContain(
      "- `src dir/bad.ts` — Bad file.",
    );
  });

  it("formats a clean file, exits 0 and adds it to index.md once", () => {
    const file = path.join(lintProj, "src dir", "ok.ts");
    fs.writeFileSync(file, "// Clean module.\nexport const a   =  1\n");
    expect(edit(file)).toMatchObject({ code: 0, stderr: "" });
    expect(fs.readFileSync(file, "utf8")).toBe("// Clean module.\nexport const a = 1;\n");
    expect(edit(file).code).toBe(0);
    const idx = fs.readFileSync(path.join(lintProj, "index.md"), "utf8");
    expect(idx.match(/src dir\/ok\.ts/g)).toHaveLength(1);
    expect(idx).toContain("- `package.json` — pacote\n- `src dir/ok.ts` — Clean module.");
  });

  it("ignores files outside the root, in node_modules or deleted", () => {
    const outside = tempDir();
    try {
      const f = path.join(outside, "x.ts");
      fs.writeFileSync(f, "const unused = 1;\n");
      expect(edit(f)).toMatchObject({ code: 0, stderr: "" });
    } finally {
      rm(outside);
    }
    expect(edit(path.join(lintProj, "gone.ts"))).toMatchObject({ code: 0, stderr: "" });
    expect(fs.readFileSync(path.join(lintProj, "index.md"), "utf8")).not.toContain("gone.ts");
  });

  it("does nothing for a project without eslint/prettier", () => {
    const f = path.join(proj, "x.ts");
    fs.writeFileSync(f, "const unused = 1;\n");
    const r = runHx(["hook", "post-edit"], {
      cwd: proj,
      stdin: { tool_name: "Edit", tool_input: { file_path: f }, cwd: proj },
    });
    expect(r).toMatchObject({ code: 0, stderr: "" });
  });
});
