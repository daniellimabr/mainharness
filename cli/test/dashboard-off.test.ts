import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emit } from "../src/events/emit";
import { notification } from "../src/hooks/attention";
import { sessionEnd } from "../src/hooks/lifecycle";
import { preBash } from "../src/hooks/pre-bash";
import { prompt } from "../src/hooks/prompt";
import { runHook } from "../src/hooks/runner";
import { isolateHome } from "./helpers";

let h: ReturnType<typeof isolateHome>;
beforeEach(() => {
  h = isolateHome();
});
afterEach(() => {
  delete process.env.HARNESS_DASHBOARD;
  h.cleanup();
});

const input = { type: "prompt", project: "p", data: {} } as const;
const eventsDir = () => `${h.home}/events`;

describe("HARNESS_DASHBOARD=off", () => {
  it("emit writes nothing", () => {
    process.env.HARNESS_DASHBOARD = "off";
    emit(input);
    expect(fs.existsSync(eventsDir())).toBe(false);
  });

  it("other values or unset keep emitting", () => {
    for (const v of [undefined, "on", "OFF", ""]) {
      if (v === undefined) delete process.env.HARNESS_DASHBOARD;
      else process.env.HARNESS_DASHBOARD = v;
      emit(input);
    }
    const lines = fs
      .readdirSync(eventsDir())
      .flatMap((f) => fs.readFileSync(`${eventsDir()}/${f}`, "utf8").trim().split("\n"));
    expect(lines).toHaveLength(4);
  });

  it("observation hooks exit at once without running the handler", async () => {
    process.env.HARNESS_DASHBOARD = "off";
    for (const [name, handler] of [
      ["prompt", prompt],
      ["notification", notification],
      ["session-end", sessionEnd],
    ] as const) {
      let ran = false;
      const t = performance.now();
      const code = await runHook(
        name,
        (i) => {
          ran = true;
          return handler(i);
        },
        "{}",
      );
      expect(code).toBe(0);
      expect(ran).toBe(false);
      expect(performance.now() - t).toBeLessThan(30);
    }
    expect(fs.existsSync(eventsDir())).toBe(false);
  });

  it("protection hooks still run and block git push --force", async () => {
    process.env.HARNESS_DASHBOARD = "off";
    const raw = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "git push --force" },
      cwd: h.home,
    });
    let out = "";
    const w = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((s: string) => ((out += s), true)) as typeof process.stdout.write;
    try {
      await runHook("pre-bash", preBash, raw);
    } finally {
      process.stdout.write = w;
    }
    expect(out).toContain("deny");
  });

  it("without off, observation hooks still run", async () => {
    let ran = false;
    await runHook("prompt", () => ((ran = true), {}), "{}");
    expect(ran).toBe(true);
  });
});
