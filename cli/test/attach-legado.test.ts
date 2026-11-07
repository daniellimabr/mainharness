// hx attach on a repo with a legacy harness: rules migrate to .harness/local-rules.json, docs are copied.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readLocalRules } from "../src/core/local-rules";
import { REPO_ROOT, rm, runHx, tempDir } from "./helpers";

let base: string;
let env: Record<string, string>;

const LEGACY = "# Projeto\n\nNunca use `ssh` ou `scp` direto: peça ao Daniel.\n\nUse pnpm.\n";
const mk = (name: string, files: Record<string, string>): string => {
  const dir = path.join(base, name);
  for (const [f, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), c);
  }
  return dir;
};
const attach = (dir: string) =>
  runHx(["attach", dir, "--approved", "--no-install", "--no-plugins"], { env });
const rulesFile = (dir: string) => path.join(dir, ".harness", "local-rules.json");

beforeAll(() => {
  base = tempDir("hx attach legado");
  env = {
    HARNESS_HOME: path.join(base, "home"),
    CLAUDE_PLUGIN_ROOT: REPO_ROOT,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
  };
});
afterAll(() => rm(base));

describe("hx attach legacy harness", () => {
  it("migrates SSH rule to .harness/local-rules.json, copies docs, reports, and is idempotent", () => {
    const dir = mk("Legado", {
      "CLAUDE.md": LEGACY,
      "ARQUITETURA.md": "# Arq\n",
      "README.md": "# r\n",
    });
    const r = attach(dir);
    expect(r.code).toBe(0);
    const rules = readLocalRules(dir);
    expect(rules).toHaveLength(1);
    expect(rules[0]?.commands).toEqual(["ssh", "scp"]);
    expect(rules[0]?.message).toContain("Nunca use");
    expect(r.stdout).toContain("Regras migradas: 1");
    expect(fs.readFileSync(path.join(dir, "docs", "legacy-harness", "CLAUDE.md"), "utf8")).toBe(
      LEGACY,
    );
    expect(fs.readFileSync(path.join(dir, "ARQUITETURA.md"), "utf8")).toBe("# Arq\n");
    expect(fs.readFileSync(path.join(dir, "docs", "contexto", "ARQUITETURA.md"), "utf8")).toBe(
      "# Arq\n",
    );
    expect(fs.existsSync(path.join(dir, "docs", "contexto", "README.md"))).toBe(false);

    const before = fs.readFileSync(rulesFile(dir), "utf8");
    const again = attach(dir);
    expect(again.code).toBe(0);
    expect(fs.readFileSync(rulesFile(dir), "utf8")).toBe(before);
    expect(again.stdout).toContain("Regras migradas: 0");
    expect(again.stdout).not.toContain("Conflito");
  });

  it("lists a conflict and never overwrites an existing rule for the same command", () => {
    const mine = [{ commands: ["ssh"], message: "regra do Daniel" }];
    const dir = mk("Conflito", {
      "CLAUDE.md": LEGACY,
      ".harness/local-rules.json": JSON.stringify(mine),
    });
    const r = attach(dir);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Conflito");
    expect(r.stdout).toContain("ssh");
    const rules = readLocalRules(dir);
    expect(rules.find((x) => x.commands.includes("ssh"))?.message).toBe("regra do Daniel");
    expect(rules.find((x) => x.commands.includes("scp"))?.message).toContain("Nunca use");
  });

  it("keeps an unreadable local-rules.json untouched and reports it", () => {
    const dir = mk("Quebrado", { "CLAUDE.md": LEGACY, ".harness/local-rules.json": "{oops" });
    const r = attach(dir);
    expect(r.code).toBe(0);
    expect(fs.readFileSync(rulesFile(dir), "utf8")).toBe("{oops");
    expect(r.stdout).toContain("Conflito");
  });

  it("does not copy a context doc over an existing different one", () => {
    const dir = mk("Doc", {
      "CLAUDE.md": "x\n",
      "NOTAS.md": "novo\n",
      "docs/contexto/NOTAS.md": "meu\n",
    });
    const r = attach(dir);
    expect(fs.readFileSync(path.join(dir, "docs", "contexto", "NOTAS.md"), "utf8")).toBe("meu\n");
    expect(r.stdout).toContain("Conflito");
  });
});
