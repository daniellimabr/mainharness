// B045: the Stop hook emits turn.end only when it lets the agent stop.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { updateState } from "../src/core/state";
import { stop } from "../src/hooks/lifecycle";
import { fakeProject, isolateHome, readEventsIn, rm } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
});
afterEach(() => {
  delete process.env.HARNESS_REPO;
  env.cleanup();
  rm(proj);
});

const turnEnds = () => readEventsIn(env.home).filter((e) => e.type === "turn.end");

it("emits turn.end with session and sprint when the agent stops", () => {
  process.env.HARNESS_REPO = env.home;
  updateState("proj-teste", (s) => {
    s.activeSprint = "S05";
  });
  expect(stop({ cwd: proj, session_id: "s1" })).toEqual({});
  expect(turnEnds()).toMatchObject([{ session: "s1", sprint: "S05", data: {} }]);
});

it("does not emit turn.end when the Stop blocks", () => {
  // harness repo with dirty cli/src and a tsc that fails: the Stop blocks
  fs.mkdirSync(path.join(proj, "cli", "src"), { recursive: true });
  fs.writeFileSync(path.join(proj, "cli", "tsconfig.json"), "{}");
  fs.writeFileSync(path.join(proj, "cli", "src", "a.ts"), "export {};\n");
  const bin = path.join(proj, "node_modules", "typescript", "bin");
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, "tsc"), `console.log("error TS1");process.exit(2);`);
  spawnSync("git", ["init", "-q"], { cwd: proj });
  spawnSync("git", ["add", "cli/tsconfig.json"], { cwd: proj });
  process.env.HARNESS_REPO = proj;
  expect(stop({ cwd: proj, session_id: "s1" }).stdout).toContain('"decision":"block"');
  expect(turnEnds()).toEqual([]);
});
