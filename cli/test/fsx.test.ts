import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs")>();
  return { ...real, renameSync: vi.fn(real.renameSync) };
});

const { writeFileAtomic } = await import("../src/core/fsx.js");
const rename = vi.mocked(fs.renameSync);
const real = await vi.importActual<typeof import("node:fs")>("node:fs");

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

describe("writeFileAtomic rename retry", () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "fsx-"));
    file = path.join(dir, "a.json");
    rename.mockClear();
    rename.mockImplementation(real.renameSync);
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("retries EPERM and then writes the file", () => {
    rename.mockImplementationOnce(() => fail("EPERM")).mockImplementationOnce(() => fail("EPERM"));
    writeFileAtomic(file, "ok");
    expect(fs.readFileSync(file, "utf8")).toBe("ok");
    expect(rename).toHaveBeenCalledTimes(3);
  });

  it("throws the last error when EPERM never clears", () => {
    rename.mockImplementation(() => fail("EPERM"));
    expect(() => writeFileAtomic(file, "x")).toThrow("EPERM");
    expect(rename).toHaveBeenCalledTimes(5);
  });

  it("does not retry other errors", () => {
    rename.mockImplementation(() => fail("ENOENT"));
    expect(() => writeFileAtomic(file, "x")).toThrow("ENOENT");
    expect(rename).toHaveBeenCalledTimes(1);
  });
});
