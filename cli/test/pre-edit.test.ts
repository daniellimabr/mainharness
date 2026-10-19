// pre-edit hook: denies edits to cli/dist/hx.js and the stable dir.
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { preEdit } from "../src/hooks/pre-edit";

const cwd = path.resolve("C:/proj");
const decide = (file_path: string) => {
  const out = preEdit({ cwd, tool_input: { file_path } });
  if (out instanceof Promise) throw new Error("sync expected");
  return out.stdout
    ? (JSON.parse(out.stdout) as { hookSpecificOutput: Record<string, string> }).hookSpecificOutput
    : null;
};

describe("pre-edit hook", () => {
  it("denies the built bundle (relative and absolute)", () => {
    for (const f of ["cli/dist/hx.js", path.join(cwd, "cli", "dist", "hx.js")]) {
      const v = decide(f);
      expect(v?.permissionDecision).toBe("deny");
      expect(v?.permissionDecisionReason).toMatch(/npm run build/);
    }
  });

  it.runIf(process.platform === "win32")(
    "denies files inside C:\\harness-stable, any case/slash",
    () => {
      for (const f of ["C:\\harness-stable\\x", "c:/HARNESS-STABLE/x"]) {
        const v = decide(f);
        expect(v?.permissionDecision).toBe("deny");
        expect(v?.permissionDecisionReason).toMatch(/nunca edite C:\\harness-stable/);
      }
    },
  );

  it("lets ordinary files through", () => {
    expect(decide("cli/src/hooks/pre-edit.ts")).toBeNull();
    expect(decide("C:/harness-stable-other/x")).toBeNull();
    expect(preEdit({ cwd, tool_input: {} })).toEqual({});
  });
});
