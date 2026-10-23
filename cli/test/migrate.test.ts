import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateProject } from "../src/commands/migrate";
import { MIGRATIONS, type Migration, removeResumeTasks } from "../src/migrations";
import { fakeProject, isolateHome, readEventsIn, rm, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let proj: string;
let plugin: string;
const prevRoot = process.env.CLAUDE_PLUGIN_ROOT;

const git = (...args: string[]) =>
  execFileSync("git", ["-C", proj, ...args], { encoding: "utf8" }).trim();

function setVersions(project: string, harness: string): void {
  const hj = path.join(proj, ".claude", "harness.json");
  const data = JSON.parse(fs.readFileSync(hj, "utf8")) as Record<string, unknown>;
  fs.writeFileSync(hj, JSON.stringify({ ...data, version: project }));
  fs.writeFileSync(
    path.join(plugin, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "main-harness", version: harness }),
  );
}

const harnessJson = () =>
  JSON.parse(fs.readFileSync(path.join(proj, ".claude", "harness.json"), "utf8")) as {
    version: string;
    migrations?: string[];
  };

const writeFile = (name: string, text: string) => (root: string) => {
  fs.writeFileSync(path.join(root, name), text);
  return [name];
};

beforeEach(() => {
  env = isolateHome();
  proj = fakeProject();
  plugin = tempDir("hx plugin");
  fs.mkdirSync(path.join(plugin, ".claude-plugin"));
  process.env.CLAUDE_PLUGIN_ROOT = plugin;
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
});

afterEach(() => {
  if (prevRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = prevRoot;
  env.cleanup();
  rm(proj);
  rm(plugin);
});

describe("migrateProject", () => {
  it("does nothing when versions match", () => {
    setVersions("0.1.0", "0.1.0");
    const r = migrateProject(proj);
    expect(r).toEqual({ from: "0.1.0", to: "0.1.0", applied: [], pending: null });
    expect(readEventsIn(env.home)).toHaveLength(0);
  });

  it("applies simple migrations in order and commits", () => {
    setVersions("0.1.0", "0.3.0");
    git("commit", "-q", "--allow-empty", "-am", "v");
    const migrations: Migration[] = [
      { version: "0.3.0", kind: "simple", description: "b", up: writeFile("b.txt", "b") },
      { version: "0.2.0", kind: "simple", description: "a", up: writeFile("a.txt", "a") },
      { version: "0.4.0", kind: "simple", description: "c", up: writeFile("c.txt", "c") },
    ];
    const r = migrateProject(proj, { migrations });
    expect(r).toEqual({ from: "0.1.0", to: "0.3.0", applied: ["0.2.0", "0.3.0"], pending: null });
    expect(fs.existsSync(path.join(proj, "c.txt"))).toBe(false);
    expect(harnessJson().version).toBe("0.3.0");
    expect(harnessJson().migrations).toEqual(["0.2.0", "0.3.0"]);
    expect(git("log", "-1", "--format=%s")).toBe("chore(harness): migrate to v0.3.0");
    expect(git("status", "--porcelain")).toBe("");
    const evs = readEventsIn(env.home).filter((e) => e.type === "harness.migrate");
    expect(evs.map((e) => e.data)).toEqual([
      { from: "0.1.0", to: "0.3.0", kind: "simple", applied: true },
      { from: "0.1.0", to: "0.3.0", kind: "simple", applied: true },
    ]);
  });

  it("bumps only the version when no migration is in range", () => {
    setVersions("0.1.0", "0.1.1");
    git("commit", "-q", "--allow-empty", "-am", "v");
    const r = migrateProject(proj, { migrations: [] });
    expect(r.applied).toEqual([]);
    expect(harnessJson().version).toBe("0.1.1");
    expect(git("log", "-1", "--format=%s")).toBe("chore(harness): migrate to v0.1.1");
    const evs = readEventsIn(env.home).filter((e) => e.type === "harness.migrate");
    expect(evs.map((e) => e.data)).toEqual([
      { from: "0.1.0", to: "0.1.1", kind: "simple", applied: true },
    ]);
  });

  it("stops at a structural migration and writes the plan", () => {
    setVersions("0.1.0", "0.3.0");
    git("commit", "-q", "--allow-empty", "-am", "v");
    let ran = false;
    const migrations: Migration[] = [
      { version: "0.2.0", kind: "simple", description: "a", up: writeFile("a.txt", "a") },
      {
        version: "0.3.0",
        kind: "structural",
        description: "move docs",
        up: () => {
          ran = true;
          return [];
        },
      },
    ];
    const r = migrateProject(proj, { migrations });
    expect(r.pending).toBe("0.3.0");
    expect(r.applied).toEqual(["0.2.0"]);
    expect(ran).toBe(false);
    expect(fs.existsSync(path.join(proj, "docs", "harness-migration-0.3.0.md"))).toBe(true);
    expect(harnessJson().version).toBe("0.1.0");
    const evs = readEventsIn(env.home).filter((e) => e.type === "harness.migrate");
    expect(evs.map((e) => e.data)).toContainEqual({
      from: "0.1.0",
      to: "0.3.0",
      kind: "structural",
      applied: false,
    });
    // a second run does not re-apply the simple migration
    fs.rmSync(path.join(proj, "a.txt"));
    migrateProject(proj, { migrations });
    expect(fs.existsSync(path.join(proj, "a.txt"))).toBe(false);
  });

  it("calls down in reverse order on downgrade", () => {
    setVersions("0.3.0", "0.1.0");
    fs.writeFileSync(path.join(proj, ".claude", "x.txt"), "x");
    git("add", "-A");
    git("commit", "-qm", "v");
    const order: string[] = [];
    const mk = (version: string): Migration => ({
      version,
      kind: "simple",
      description: version,
      up: () => [],
      down: () => {
        order.push(version);
        return [];
      },
    });
    const r = migrateProject(proj, { migrations: [mk("0.2.0"), mk("0.3.0"), mk("0.1.0")] });
    expect(order).toEqual(["0.3.0", "0.2.0"]);
    expect(r.applied).toEqual(["0.3.0", "0.2.0"]);
    expect(r.pending).toBeNull();
    expect(harnessJson().version).toBe("0.1.0");
    expect(git("log", "-1", "--format=%s")).toBe("chore(harness): migrate to v0.1.0");
  });

  it("refreshes catalog skills already copied into the project, even outside optionalSkills", () => {
    const cat = path.join(plugin, "skills", "optional");
    for (const name of ["frontend-design", "other"]) {
      fs.mkdirSync(path.join(cat, name), { recursive: true });
      fs.writeFileSync(path.join(cat, name, "SKILL.md"), `new ${name}`);
    }
    const skills = path.join(proj, ".claude", "skills");
    fs.mkdirSync(path.join(skills, "frontend-design"), { recursive: true });
    fs.writeFileSync(path.join(skills, "frontend-design", "SKILL.md"), "old");
    fs.writeFileSync(path.join(skills, "frontend-design", "stale.md"), "old");
    fs.mkdirSync(path.join(skills, "minha-skill"));
    fs.writeFileSync(path.join(skills, "minha-skill", "SKILL.md"), "mine");
    setVersions("0.1.0", "0.1.1");
    migrateProject(proj, { migrations: [], commit: false });
    expect(fs.readdirSync(path.join(skills, "frontend-design"))).toEqual(["SKILL.md"]);
    expect(fs.readFileSync(path.join(skills, "frontend-design", "SKILL.md"), "utf8")).toBe(
      "new frontend-design",
    );
    expect(fs.existsSync(path.join(skills, "other"))).toBe(false);
    expect(fs.readFileSync(path.join(skills, "minha-skill", "SKILL.md"), "utf8")).toBe("mine");
  });

  it("v0.9.0 deletes only the harness's resume tasks and the pending folder", () => {
    const a = "MainHarness-Resume-0f8fad5b-d9cb-469f-a165-70867728950e";
    const b = "MainHarness-Resume-7c9e6679-7425-40de-944b-e07fc1f90ae7";
    const calls: string[][] = [];
    const fake = (cmd: string, args: string[]) => {
      calls.push([cmd, ...args]);
      const out = `"\\${a}","N/A","Ready"\r\n"\\${b}","N/A","Ready"\r\n"\\${a}","N/A","Ready"\r\n"\\Other","N/A","Ready"`;
      return { ok: true, out: args[0] === "/query" ? out : "" };
    };
    const pending = path.join(env.home, "resume");
    fs.mkdirSync(pending, { recursive: true });
    fs.writeFileSync(path.join(pending, "x.json"), "{}");
    expect(removeResumeTasks(fake)).toEqual([]);
    expect(calls).toEqual([
      ["schtasks", "/query", "/fo", "csv", "/nh"],
      ["schtasks", "/delete", "/tn", a, "/f"],
      ["schtasks", "/delete", "/tn", b, "/f"],
    ]);
    expect(fs.existsSync(pending)).toBe(false);
    // no pending folder: schtasks is never called
    calls.length = 0;
    expect(removeResumeTasks(fake)).toEqual([]);
    expect(calls).toEqual([]);
    // schtasks missing (not Windows) or failing: nothing deleted, no throw
    fs.mkdirSync(pending);
    expect(removeResumeTasks(() => ({ ok: false, out: "" }))).toEqual([]);
    expect(fs.existsSync(pending)).toBe(true);
    expect(MIGRATIONS.map((m) => [m.version, m.kind])).toContainEqual(["0.9.0", "simple"]);
  });

  it("leaves a plan when a structural migration has no down", () => {
    setVersions("0.2.0", "0.1.0");
    const r = migrateProject(proj, {
      commit: false,
      migrations: [{ version: "0.2.0", kind: "structural", description: "s", up: () => [] }],
    });
    expect(r.pending).toBe("0.2.0");
    expect(harnessJson().version).toBe("0.2.0");
    expect(fs.existsSync(path.join(proj, "docs", "harness-migration-0.2.0.md"))).toBe(true);
  });
});
