// post-edit hook: flags BOM and mojibake that lint and prettier miss.
// Escapes keep this file itself free of the patterns the hook flags.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { postEdit } from "../src/hooks/post-edit";

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "post-edit-enc-"));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

/** Writes `onDisk` and runs the hook as if the tool had just written `written`. */
const run = async (onDisk: string, written: Record<string, unknown> = { content: onDisk }) => {
  fs.writeFileSync(path.join(root, "f.txt"), onDisk);
  return postEdit({ cwd: root, tool_input: { file_path: "f.txt", ...written } });
};

describe("post-edit hook: encoding check", () => {
  it("flags a BOM", async () => {
    const out = await run("﻿ola\n");
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toMatch(/BOM/);
  });

  it.each(["Ã§", "Ã£", "â€™"])("flags mojibake %s written by Write", async (bad) => {
    const out = await run(`informa${bad}o\n`);
    expect(out.exitCode).toBe(2);
    expect(out.stderr).toMatch(/quebrado/);
  });

  it("flags mojibake in Edit new_string and MultiEdit edits", async () => {
    const bad = "Ã§";
    expect((await run("x\n", { new_string: bad })).exitCode).toBe(2);
    expect((await run("x\n", { edits: [{ new_string: bad }] })).exitCode).toBe(2);
  });

  it("accepts clean UTF-8 with accents", async () => {
    const clean = "ação, não, Ã isolado, “aspas” e café\n";
    expect(await run(clean)).toEqual({});
  });

  it("does not block a clean edit in a file that already mentions mojibake", async () => {
    expect(await run("ex.: Ã§\n", { new_string: "texto limpo" })).toEqual({});
  });
});
