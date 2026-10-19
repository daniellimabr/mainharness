// Stop hook typecheck: tsc runs only when cli/src changed and blocks with its first lines.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { typecheckReason, type Exec } from "../src/hooks/lifecycle";
import { rm, tempDir } from "./helpers";

let root: string;

beforeEach(() => {
  root = tempDir("hx tc");
  fs.mkdirSync(path.join(root, "cli", "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "cli", "tsconfig.json"), "{}");
});
afterEach(() => rm(root));

function fakeExec(porcelain: string, tsc: { status: number | null; stdout: string }) {
  return vi.fn<Exec>((_cmd, args) =>
    args[0] === "status" ? { status: 0, stdout: porcelain } : tsc,
  );
}

describe("stop typecheck", () => {
  it("returns the first lines of the tsc error when cli/src is dirty", () => {
    const err = Array.from({ length: 30 }, (_, i) => `cli/src/a.ts(${i},1): error TS2322`).join(
      "\n",
    );
    const exec = fakeExec(" M cli/src/a.ts\n", { status: 2, stdout: err });
    const reason = typecheckReason(root, exec);
    expect(reason).toContain("cli/src/a.ts(0,1): error TS2322");
    expect(reason).toContain("cli/src/a.ts(19,1)");
    expect(reason).not.toContain("cli/src/a.ts(20,1)");
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it("does not run tsc when cli/src is clean", () => {
    const exec = fakeExec(" M docs/x.md\n", { status: 2, stdout: "boom" });
    expect(typecheckReason(root, exec)).toBeNull();
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it("does not block when tsc passes, times out or is missing", () => {
    for (const status of [0, null]) {
      expect(
        typecheckReason(root, fakeExec("?? cli/src/n.ts\n", { status, stdout: "" })),
      ).toBeNull();
    }
  });

  it("skips projects without cli/tsconfig.json", () => {
    fs.rmSync(path.join(root, "cli", "tsconfig.json"));
    const exec = fakeExec(" M cli/src/a.ts\n", { status: 2, stdout: "boom" });
    expect(typecheckReason(root, exec)).toBeNull();
    expect(exec).not.toHaveBeenCalled();
  });
});
