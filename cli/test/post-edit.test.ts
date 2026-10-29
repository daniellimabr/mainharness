// post-edit hook: drops index.md entries whose files no longer exist.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { postEdit } from "../src/hooks/post-edit";

let root: string;
const idx = () => path.join(root, "index.md");

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "post-edit-"));
  fs.writeFileSync(path.join(root, "a.txt"), "a\n");
  fs.writeFileSync(path.join(root, "b.txt"), "b\n");
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("post-edit hook: index cleanup", () => {
  it("removes entries of missing files and keeps the rest intact", async () => {
    const outside = `${root}-outside.txt`;
    fs.writeFileSync(outside, "x\n");
    fs.writeFileSync(
      idx(),
      [
        "# Index",
        "",
        "Texto livre com `gone.txt` no meio.",
        "- `gone.txt` — list outside the files section",
        "",
        "## Arquivos",
        "",
        "- `a.txt` — keep A",
        "- `gone.txt` — deleted",
        "- sem crase",
        "- `` vazio",
        "- `bad\0name` — NUL",
        "- `old/moved.txt` — moved",
        `- \`../${path.basename(outside)}\` — escapes the project`,
        `- \`${outside.split(path.sep).join("/")}\` — absolute path`,
        "- `b.txt` — keep B",
        "",
      ].join("\n"),
    );
    const out = await postEdit({ cwd: root, tool_input: { file_path: "b.txt" } });
    fs.rmSync(outside);
    expect(out).toEqual({});
    expect(fs.readFileSync(idx(), "utf8")).toBe(
      [
        "# Index",
        "",
        "Texto livre com `gone.txt` no meio.",
        "- `gone.txt` — list outside the files section",
        "",
        "## Arquivos",
        "",
        "- `a.txt` — keep A",
        "- sem crase",
        "- `` vazio",
        "- `b.txt` — keep B",
        "",
      ].join("\n"),
    );
  });

  it("leaves index.md untouched when every entry exists", async () => {
    const text = "## Arquivos\r\n\r\n- `a.txt` — A\r\n- `b.txt` — B\r\n";
    fs.writeFileSync(idx(), text);
    await postEdit({ cwd: root, tool_input: { file_path: "a.txt" } });
    expect(fs.readFileSync(idx(), "utf8")).toBe(text);
  });
});
