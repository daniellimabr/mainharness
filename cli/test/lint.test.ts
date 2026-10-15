import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lintFile } from "../src/lint/index";
import { REPO_ROOT, rm, tempDir } from "./helpers";

let dir: string;
beforeEach(() => {
  dir = tempDir("hx lint");
  fs.symlinkSync(path.join(REPO_ROOT, "node_modules"), path.join(dir, "node_modules"), "junction");
  fs.writeFileSync(path.join(dir, "package.json"), "{}\n");
  fs.writeFileSync(
    path.join(dir, "eslint.config.js"),
    'module.exports = [{ ignores: ["gen/**"] }, { rules: { "no-var": "error", "no-undef": "error" } }];\n',
  );
  fs.writeFileSync(path.join(dir, ".prettierignore"), "raw.js\n");
});
afterEach(() => {
  fs.unlinkSync(path.join(dir, "node_modules"));
  rm(dir);
});

const put = (name: string, text: string) => {
  const f = path.join(dir, name);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  return f;
};

describe("lintFile", () => {
  it("fixes what eslint can fix and formats with prettier", async () => {
    const f = put("a.js", "var x = 1\nexport default x\n");
    expect(await lintFile(dir, f)).toEqual([]);
    expect(fs.readFileSync(f, "utf8")).toBe("let x = 1;\nexport default x;\n");
  });

  it("reports remaining problems as file:line:col rule message", async () => {
    const f = put("sub dir/b.js", "foo();\n");
    expect(await lintFile(dir, f)).toEqual(["sub dir/b.js:1:1 no-undef 'foo' is not defined."]);
  });

  it("respects .prettierignore and eslint ignores", async () => {
    const raw = put("raw.js", "let   y = 1;\nexport default y\n");
    expect(await lintFile(dir, raw)).toEqual([]);
    expect(fs.readFileSync(raw, "utf8")).toBe("let   y = 1;\nexport default y\n");
    expect(await lintFile(dir, put("gen/c.js", "foo();\n"))).toEqual([]);
  });

  it("caps output at 20 lines", async () => {
    const f = put("many.js", Array.from({ length: 25 }, (_, i) => `f${i}();`).join("\n") + "\n");
    const out = await lintFile(dir, f);
    expect(out).toHaveLength(21);
    expect(out[20]).toBe("... e mais 5 problemas");
  });

  it("does nothing without package.json, eslint config or tools", async () => {
    fs.unlinkSync(path.join(dir, "eslint.config.js"));
    expect(await lintFile(dir, put("d.js", "foo();\n"))).toEqual([]);
    const bare = tempDir("hx bare");
    try {
      fs.writeFileSync(path.join(bare, "package.json"), "{}\n");
      const f = path.join(bare, "e.js");
      fs.writeFileSync(f, "var   z\n");
      expect(await lintFile(bare, f)).toEqual([]);
      expect(fs.readFileSync(f, "utf8")).toBe("var   z\n");
    } finally {
      rm(bare);
    }
  });
});
