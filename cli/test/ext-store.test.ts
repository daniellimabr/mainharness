import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readProjects, readState, watchDashboard } from "../../extension/src/store";

let home: string;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "ext-store-"));
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

const dash = (id: string, content: string): void => {
  fs.mkdirSync(path.join(home, "dashboard"), { recursive: true });
  fs.writeFileSync(path.join(home, "dashboard", `${id}.json`), content);
};
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe("readProjects", () => {
  it("returns [] when missing, empty or broken", () => {
    expect(readProjects(home)).toEqual([]);
    fs.writeFileSync(path.join(home, "projects.json"), "");
    expect(readProjects(home)).toEqual([]);
    fs.writeFileSync(path.join(home, "projects.json"), "{oops");
    expect(readProjects(home)).toEqual([]);
  });
  it("lists id, name and path", () => {
    fs.writeFileSync(
      path.join(home, "projects.json"),
      JSON.stringify({
        projects: [{ id: "a", name: "A", path: "C:/a", version: "1" }, { name: "x" }],
      }),
    );
    expect(readProjects(home)).toEqual([{ id: "a", name: "A", path: "C:/a" }]);
  });
});

describe("readState", () => {
  it("missing, empty and broken do not throw", () => {
    expect(readState(home, "p")).toEqual({ kind: "missing" });
    dash("p", "");
    expect(readState(home, "p")).toEqual({ kind: "invalid" });
    dash("p", "{oops");
    expect(readState(home, "p")).toEqual({ kind: "invalid" });
  });
  it("newer version", () => {
    dash("p", JSON.stringify({ v: 2 }));
    expect(readState(home, "p")).toEqual({ kind: "newer", v: 2 });
  });
  it("ok, ignoring unknown fields", () => {
    dash("p", JSON.stringify({ v: 1, extra: true, sprints: [] }));
    const r = readState(home, "p");
    expect(r.kind).toBe("ok");
  });
});

describe("watchDashboard", () => {
  it("notifies once per burst and stops on dispose", async () => {
    dash("p", "{}");
    const cb = vi.fn();
    const dispose = watchDashboard(home, cb, 100);
    for (let i = 0; i < 5; i++) dash("p", `{"v":1,"i":${i}}`);
    await sleep(500);
    expect(cb).toHaveBeenCalledTimes(1);
    dispose();
    dash("p", "{}");
    await sleep(400);
    expect(cb).toHaveBeenCalledTimes(1);
  });
  it("survives a missing folder and notifies once it exists", async () => {
    const cb = vi.fn();
    const dispose = watchDashboard(home, cb, 50, 100);
    await sleep(250);
    expect(cb).not.toHaveBeenCalled();
    dash("p", "{}");
    await sleep(600);
    expect(cb).toHaveBeenCalled();
    dispose();
  });
});
