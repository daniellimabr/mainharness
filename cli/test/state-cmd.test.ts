import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/state";
import { emit } from "../src/events/emit";
import { fakeProject, rm, tempDir } from "./helpers";

let base: string;
const OLD = { ...process.env };
const dash = (id: string) => path.join(base, "home", "dashboard", `${id}.json`);
const read = (id: string) =>
  JSON.parse(fs.readFileSync(dash(id), "utf8")) as Record<string, unknown>;
const register = (ids: string[]) =>
  fs.writeFileSync(
    path.join(base, "home", "projects.json"),
    JSON.stringify({ projects: ids.map((id) => ({ id, name: id, path: base })) }),
  );

beforeEach(() => {
  base = tempDir("state cmd");
  fs.mkdirSync(path.join(base, "home"));
  process.env.HARNESS_HOME = path.join(base, "home");
  delete process.env.HARNESS_DASHBOARD;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...OLD };
  rm(base);
});

describe("hx state rebuild", () => {
  it("rebuilds the current project, equal to what emit wrote", () => {
    const dir = fakeProject("p1");
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    emit({ type: "session.start", project: "p1", data: { source: "startup" } });
    const before = read("p1");
    fs.rmSync(dash("p1"));
    expect(run(["rebuild"])).toBe(0);
    expect({ ...read("p1"), updated_at: 0 }).toEqual({ ...before, updated_at: 0 });
    rm(dir);
  });

  it("--all rebuilds every registered project, even with dashboard off; empty one gets empty state", () => {
    process.env.HARNESS_DASHBOARD = "off";
    emit({ type: "session.start", project: "a", data: { source: "startup" } });
    register(["a", "b"]);
    expect(run(["rebuild", "--all"])).toBe(0);
    expect(read("a")).toBeTruthy();
    expect(read("b")).toBeTruthy();
    expect(console.log).toHaveBeenCalledTimes(2);
  });

  it("project not attached: clear message, exit 1", () => {
    vi.spyOn(process, "cwd").mockReturnValue(base);
    expect(run(["rebuild"])).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("não está conectado"));
  });

  it("unwritable folder: clear error, exit 1", () => {
    fs.writeFileSync(path.join(base, "home", "dashboard"), "x"); // a file where the folder should be
    register(["a"]);
    expect(run(["rebuild", "--all"])).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("a: não consegui gravar"));
  });
});
