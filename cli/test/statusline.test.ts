import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { statusline } from "../src/commands/statusline";
import { fakeProject, isolateHome, readEventsIn, rm } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject("proj-sl");
});

afterEach(() => {
  env.cleanup();
  rm(proj);
});

const input = (five: number, week: number, name = "Corrige login") =>
  JSON.stringify({
    session_id: "sess-1",
    session_name: name,
    cwd: proj,
    workspace: { current_dir: proj },
    rate_limits: {
      five_hour: { used_percentage: five },
      seven_day: { used_percentage: week },
    },
  });

const events = () => readEventsIn(env.home).filter((e) => e.type === "statusline");

describe("hx statusline", () => {
  it("prints title and both limits, and records one event", () => {
    expect(statusline(input(42.4, 17))).toBe("Corrige login · 5h 42% · sem 17%");
    const ev = events();
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({
      project: "proj-sl",
      session: "sess-1",
      data: { five_hour: 42.4, seven_day: 17, title: "Corrige login" },
    });
  });

  it("does not record the same values twice, records again when one changes", () => {
    statusline(input(42, 17));
    statusline(input(42, 17));
    expect(events()).toHaveLength(1);
    statusline(input(43, 17));
    expect(events()).toHaveLength(2);
  });

  it("cleans forbidden characters from the title", () => {
    expect(statusline(input(1, 2, "a{b}\nc"))).toBe("a b  c · 5h 1% · sem 2%");
    expect(events()[0]?.data).toMatchObject({ title: "a b  c" });
  });

  it("prints a minimal line and records nothing on empty or invalid JSON", () => {
    expect(statusline("")).toBe("hx");
    expect(statusline("{ broken")).toBe("hx");
    expect(statusline("[1]")).toBe("hx");
    expect(events()).toHaveLength(0);
  });

  it("skips missing limits and records nothing outside an attached project", () => {
    const line = statusline(JSON.stringify({ session_name: "Chat", cwd: env.home }));
    expect(line).toBe("Chat");
    expect(events()).toHaveLength(0);
  });
});
