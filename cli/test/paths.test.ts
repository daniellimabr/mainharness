import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { harnessHome } from "../src/core/paths";

describe("harnessHome", () => {
  const saved = process.env.HARNESS_HOME;
  afterEach(() => {
    if (saved === undefined) delete process.env.HARNESS_HOME;
    else process.env.HARNESS_HOME = saved;
  });
  const withHome = (v: string) => {
    process.env.HARNESS_HOME = v;
    return harnessHome;
  };

  it("empty or unset uses ~/.harness", () => {
    expect(withHome("")()).toBe(path.join(os.homedir(), ".harness"));
    delete process.env.HARNESS_HOME;
    expect(harnessHome()).toBe(path.join(os.homedir(), ".harness"));
  });

  it("accepts an absolute folder", () => {
    const dir = path.join(os.tmpdir(), "hh-test");
    expect(withHome(dir)()).toBe(dir);
  });

  it.each(["rel/dir", ".hh", "\\.hh", "C:\\", "C:/", "/", "\\"])(
    "refuses %s with a clear error",
    (v) => {
      expect(withHome(v)).toThrow(/HARNESS_HOME/);
    },
  );
});
