import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateEvent } from "../src/events/schema";
import { fakeProject, isolateHome, readEventsIn, rm, runHx, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let dir: string;
let inbox: string;
const hx = (args: string[], stdin?: string) =>
  runHx(args, { cwd: dir, stdin, env: { HARNESS_INBOX: inbox } });
const events = () => readEventsIn(env.home);

beforeEach(() => {
  env = isolateHome();
  dir = fakeProject();
  inbox = tempDir("hx inbox");
});
afterEach(() => {
  for (const e of events()) expect(validateEvent(e)).toEqual([]);
  env.cleanup();
  rm(dir);
  rm(inbox);
});

describe("hx request", () => {
  const args = [
    "request",
    "--title",
    "Lint de CSS no post-edit",
    "--need",
    "Rodar stylelint nos .css editados",
    "--why",
    "Erros de CSS só aparecem na revisão",
    "--priority",
    "alta",
  ];

  it("creates new files and never overwrites", () => {
    const a = hx(args);
    expect(a.stderr).toBe("");
    expect(a.code).toBe(0);
    const files = fs.readdirSync(inbox).sort();
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}-proj-teste-lint-de-css-no-post-edit\.md$/);
    const first = path.join(inbox, String(files[0]));
    const text = fs.readFileSync(first, "utf8");
    expect(text).toContain("Rodar stylelint nos .css editados");
    expect(text).toContain("**Prioridade:** alta");
    expect(text).not.toContain("{{");

    fs.writeFileSync(first, "editado por Daniel");
    expect(hx(args).code).toBe(0);
    expect(hx(args).code).toBe(0);
    const all = fs.readdirSync(inbox).sort();
    expect(all).toHaveLength(3);
    expect(all.some((f) => f.endsWith("-2.md"))).toBe(true);
    expect(all.some((f) => f.endsWith("-3.md"))).toBe(true);
    expect(fs.readFileSync(first, "utf8")).toBe("editado por Daniel");

    const ev = events().filter((e) => e.type === "harness.request");
    expect(ev).toHaveLength(3);
    expect(ev[0]?.data).toEqual({ file: files[0], priority: "alta" });
  });

  it("rejects missing fields and bad priority", () => {
    expect(hx(["request", "--title", "x"]).code).toBe(1);
    expect(hx([...args.slice(0, 7), "--priority", "urgente"]).code).toBe(1);
    expect(fs.readdirSync(inbox)).toHaveLength(0);
  });
});

describe("hx run", () => {
  const node = (code: string) => `"${process.execPath}" -e "${code}"`;

  it("returns OK and a short summary on success", () => {
    const r = hx(["run", node("console.log('noise');console.log('Tests 5 passed')")]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^OK \(\d+\.\ds\)/);
    expect(r.stdout).toContain("Tests 5 passed");
    expect(r.stdout).not.toContain("noise");
  });

  it("returns the same exit code and only failure lines + tail", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`).join("\\n");
    const r = hx([
      "run",
      node(`console.log('${lines}');console.error('Error: boom');process.exit(3)`),
    ]);
    expect(r.code).toBe(3);
    expect(r.stdout).toContain("Error: boom");
    expect(r.stdout).toContain("FALHOU (exit 3");
    expect(r.stdout).not.toContain("line 10\n");
    expect(r.stdout).toContain("line 49");
  });
});

describe("hx handoff", () => {
  it("saves stdin, shows and consumes it", () => {
    const w = hx(["handoff"], "Próximo passo: terminar T03.\n");
    expect(w.stderr).toBe("");
    expect(w.code).toBe(0);
    const hdir = path.join(env.home, "handoffs", "proj-teste");
    const files = fs.readdirSync(hdir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{8}-\d{6}\.md$/);
    expect(w.stdout).toContain(files[0]);
    const text = fs.readFileSync(path.join(hdir, String(files[0])), "utf8");
    expect(text).toContain("**Projeto:** proj-teste");
    expect(text).toContain("Próximo passo: terminar T03.");

    expect(hx(["handoff", "--show"]).stdout).toContain("Próximo passo: terminar T03.");
    expect(hx(["handoff", "--consume"]).code).toBe(0);
    const st = JSON.parse(fs.readFileSync(path.join(env.home, "state", "proj-teste.json"), "utf8"));
    expect(st.lastHandoff).toMatchObject({ consumed: true });
    expect(events().find((e) => e.type === "handoff")?.data).toEqual({
      mode: "manual",
      file: files[0],
    });
  });

  it("empty stdin is a friendly error", () => {
    const r = hx(["handoff"], "  \n");
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("handoff vazio");
  });
});

describe("hx review", () => {
  it("emits review.result", () => {
    expect(hx(["review", "fail", "t02", "--agent", "reviewer"]).code).toBe(0);
    expect(events()[0]).toMatchObject({
      type: "review.result",
      task: "T02",
      agent: "reviewer",
      data: { result: "fail" },
    });
    expect(hx(["review", "maybe", "T02"]).code).toBe(1);
  });
});
