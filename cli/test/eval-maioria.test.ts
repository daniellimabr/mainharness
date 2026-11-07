// Tests for the 2-of-3 majority rule in hx eval (B077).
import { describe, expect, it } from "vitest";
import { majority } from "../src/eval/run";

/** attempt() that answers each item from a script of pass/fail per execution, counting executions. */
function scripted(script: boolean[]) {
  let calls = 0;
  const attempt = (xs: number[]) => {
    const passed = script[calls++] ?? false;
    return Promise.resolve(xs.map(() => ({ passed })));
  };
  return { attempt, calls: () => calls };
}

describe("majority", () => {
  it("passes on the first try: 1 execution, no repeat", async () => {
    const s = scripted([true]);
    expect(await majority([1], s.attempt)).toEqual([{ passed: true, attempts: 1 }]);
    expect(s.calls()).toBe(1);
  });

  it("fail, pass, pass: passes in 3 executions", async () => {
    const s = scripted([false, true, true]);
    expect(await majority([1], s.attempt)).toEqual([{ passed: true, attempts: 3 }]);
  });

  it("fail, pass, fail: fails in 3 executions", async () => {
    const s = scripted([false, true, false]);
    expect(await majority([1], s.attempt)).toEqual([{ passed: false, attempts: 3 }]);
  });

  it("fail, fail: fails in 2 executions (majority impossible)", async () => {
    const s = scripted([false, false, true]);
    expect(await majority([1], s.attempt)).toEqual([{ passed: false, attempts: 2 }]);
    expect(s.calls()).toBe(2);
  });

  it("only the failed item is rerun", async () => {
    const seen: number[][] = [];
    const out = await majority([1, 2], (xs) => {
      seen.push(xs);
      return Promise.resolve(xs.map((x) => ({ passed: x === 1 })));
    });
    expect(seen).toEqual([[1, 2], [2]]);
    expect(out.map((o) => [o.passed, o.attempts])).toEqual([
      [true, 1],
      [false, 2],
    ]);
  });
});
