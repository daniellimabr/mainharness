import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/run";

describe.runIf(process.platform === "win32")("hx run", () => {
  const cwd = process.cwd();
  afterEach(() => {
    process.chdir(cwd);
    vi.restoreAllMocks();
  });

  it("gives the child an upper-case drive letter when the cwd comes as c:\\ (Git Bash)", () => {
    process.chdir(cwd.replace(/^[A-Z]:/, (d) => d.toLowerCase()));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(run(["node", "-e", "console.log('test cwd=' + process.cwd())"])).toBe(0);
    expect(log.mock.calls[0]?.[0]).toContain(
      `test cwd=${cwd.replace(/^[a-z]:/, (d) => d.toUpperCase())}`,
    );
  });
});
