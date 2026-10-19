import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildRepoMap, describeFile, ensureIndexEntry, summarizeIndex } from "../src/repomap/index";
import { rm, tempDir } from "./helpers";

let dir: string;
beforeEach(() => (dir = tempDir("hx repomap")));
afterEach(() => rm(dir));

function put(rel: string, text: string): string {
  const f = path.join(dir, ...rel.split("/"));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  return f;
}

describe("describeFile", () => {
  it.each([
    ["a.ts", "// Does A things.\nexport {};\n", "Does A things."],
    ["b.py", "#!/usr/bin/env python\n# Script B.\n", "Script B."],
    ["c.css", "/* Styles for C */\nbody {}\n", "Styles for C"],
    ["d.ts", "/**\n * Module D.\n */\n", "Module D."],
    ["e.html", "<!-- Page E -->\n<html></html>\n", "Page E"],
    ["f.md", "---\nname: f\ndescription: Skill F does f.\n---\n# Title\n", "Skill F does f."],
    ["g.md", "Intro\n\n# Guide G\n", "Guide G"],
    ["h.json", '{ "a": 1 }\n', "(sem descrição)"],
    ["i.yml", "\n\n# Workflow I\non: push\n", "Workflow I"],
  ])("%s", (name, text, want) => {
    expect(describeFile(put(name, text))).toBe(want);
  });
});

describe("ensureIndexEntry", () => {
  const index = "# Mapa\n\n## Arquivos\n\n- `b.ts` — b\n- `d.ts` — d\n\n## Outros\n\nnotas\n";

  it("inserts a new file sorted inside the section, only once", () => {
    put("index.md", index);
    const f = put("c dir/c.ts", "// C purpose.\n");
    expect(ensureIndexEntry(dir, f)).toBe(true);
    expect(ensureIndexEntry(dir, f)).toBe(false);
    expect(fs.readFileSync(path.join(dir, "index.md"), "utf8")).toBe(
      "# Mapa\n\n## Arquivos\n\n- `b.ts` — b\n- `c dir/c.ts` — C purpose.\n- `d.ts` — d\n\n## Outros\n\nnotas\n",
    );
  });

  it("appends at the end of the section and at its start", () => {
    put("index.md", index);
    ensureIndexEntry(dir, put("z.ts", "// Z.\n"));
    ensureIndexEntry(dir, put("a.ts", "// A.\n"));
    const text = fs.readFileSync(path.join(dir, "index.md"), "utf8");
    expect(text).toContain(
      "## Arquivos\n\n- `a.ts` — A.\n- `b.ts` — b\n- `d.ts` — d\n- `z.ts` — Z.\n\n## Outros",
    );
  });

  it("creates the section when missing and skips index.md, node_modules and no index", () => {
    put("index.md", "# Mapa\n");
    ensureIndexEntry(dir, put("x.ts", "// X.\n"));
    expect(fs.readFileSync(path.join(dir, "index.md"), "utf8")).toBe(
      "# Mapa\n\n## Arquivos\n\n- `x.ts` — X.\n",
    );
    expect(ensureIndexEntry(dir, path.join(dir, "index.md"))).toBe(false);
    expect(ensureIndexEntry(dir, put("node_modules/p/i.js", "//x\n"))).toBe(false);
    fs.unlinkSync(path.join(dir, "index.md"));
    expect(ensureIndexEntry(dir, put("y.ts", "// Y.\n"))).toBe(false);
  });

  // B025: the hook adds a line, then a manual edit of index.md adds the same path again.
  it("removes duplicate entries, including when index.md itself is edited", () => {
    const f = put("b dir/r-x.ts", "// R.\n");
    put("index.md", index);
    ensureIndexEntry(dir, f);
    const idx = path.join(dir, "index.md");
    fs.writeFileSync(
      idx,
      fs.readFileSync(idx, "utf8").replace("- `d.ts`", "- `b dir/r-x.ts` — manual\n- `d.ts`"),
    );
    expect(ensureIndexEntry(dir, idx)).toBe(false);
    expect(fs.readFileSync(idx, "utf8")).toBe(
      "# Mapa\n\n## Arquivos\n\n- `b dir/r-x.ts` — R.\n- `b.ts` — b\n- `d.ts` — d\n\n## Outros\n\nnotas\n",
    );
  });
});

describe("buildRepoMap", () => {
  it("walks folders when not a git repo, skipping node_modules/dist", () => {
    put("src/a.ts", "// A.\n");
    put("README.md", "# Projeto\n");
    put("node_modules/x/i.js", "// no\n");
    put("dist/out.js", "// no\n");
    put("index.md", "old\n");
    const map = buildRepoMap(dir);
    expect(map).toContain("## Arquivos\n\n- `README.md` — Projeto\n- `src/a.ts` — A.\n");
    expect(map).not.toMatch(/node_modules|dist\/|`index\.md`/);
  });

  it("uses git ls-files in a repo (tracked + untracked, not ignored)", () => {
    execFileSync("git", ["init", "-q", dir]);
    put(".gitignore", "secret.txt\n");
    put("secret.txt", "x");
    put("lib/b.js", "// B.\n");
    const map = buildRepoMap(dir);
    expect(map).toContain("- `.gitignore` — (sem descrição)");
    expect(map).toContain("- `lib/b.js` — B.");
    expect(map).not.toContain("secret.txt");
  });
});

describe("summarizeIndex", () => {
  it("counts entries and lists ## headings, capped", () => {
    put("index.md", "# M\n\n## Arquivos\n\n- `a` — a\n- `b` — b\n\n## Notas\n");
    expect(summarizeIndex(dir)).toBe(
      "Mapa do repo (index.md): 2 arquivos. Seções: Arquivos; Notas.",
    );
    expect(summarizeIndex(dir, 20)?.length).toBe(20);
    fs.unlinkSync(path.join(dir, "index.md"));
    expect(summarizeIndex(dir)).toBeNull();
  });
});
