// S14 / desafio 3 hidden cases: `hx worker list` edge cases the model never sees.
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/commands/worker";
import { isolateHome } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let out: string[];
let err: string[];

const put = (workers: unknown) =>
  fs.writeFileSync(path.join(env.home, "config.json"), JSON.stringify({ workers }));

beforeEach(() => {
  env = isolateHome();
  out = [];
  err = [];
  vi.spyOn(console, "log").mockImplementation((...a) => void out.push(a.join(" ")));
  vi.spyOn(console, "error").mockImplementation((...a) => void err.push(a.join(" ")));
});
afterEach(() => {
  vi.restoreAllMocks();
  env.cleanup();
});

describe("hx worker list (hidden)", () => {
  it("sorts aliases and shows model and url", async () => {
    put({
      zeta: { url: "http://h:1", model: "m/z", token: "tok-z" },
      alfa: { url: "http://h:2", model: "m/a", token: "tok-a" },
      media: { url: "http://h:3", model: "m/m", token: "tok-m" },
    });
    expect(await run(["list"])).toBe(0);
    expect(out.map((l) => l.split("  ")[0])).toEqual(["alfa", "media", "zeta"]);
    expect(out[0]).toContain("m/a");
    expect(out[0]).toContain("http://h:2");
  });

  it("never prints a token, on stdout or stderr", async () => {
    put({
      a: { url: "http://h", model: "m", token: "sk-super-secret" },
      b: { url: 5, model: "m", token: "sk-super-secret" },
    });
    await run(["list"]);
    expect(out.join("\n") + err.join("\n")).not.toContain("sk-super-secret");
  });

  it("formats the price: free, absent and paid", async () => {
    put({
      a: { url: "http://h", model: "m", token: "t", price: { input: 0, output: 0 } },
      b: { url: "http://h", model: "m", token: "t" },
      c: { url: "http://h", model: "m", token: "t", price: { input: 1.5, output: 7 } },
    });
    expect(await run(["list"])).toBe(0);
    expect(out[0]).toMatch(/ {2}grátis$/);
    expect(out[1]).toMatch(/ {2}sem preço$/);
    expect(out[2]).toMatch(/ {2}US\$ 1\.5\/7 por milhão$/);
  });

  it("hides credentials embedded in the url", async () => {
    put({ a: { url: "https://user:pa55@host:20128/x", model: "m", token: "t" } });
    expect(await run(["list"])).toBe(0);
    expect(out[0]).toContain("https://host:20128/x");
    expect(out.join("\n")).not.toMatch(/user|pa55/);
  });

  it("says so when there are no workers, exit 0", async () => {
    put({});
    expect(await run(["list"])).toBe(0);
    expect(out).toEqual(["Nenhum trabalhador configurado."]);
    fs.writeFileSync(path.join(env.home, "config.json"), "{}");
    out.length = 0;
    expect(await run(["list"])).toBe(0);
    expect(out).toEqual(["Nenhum trabalhador configurado."]);
  });

  it("marks a malformed alias, still lists the others and exits 1", async () => {
    put({
      bom: { url: "http://h", model: "m", token: "t" },
      quebrado: { url: "http://h", model: 42, token: "t" },
      semurl: { model: "m", token: "t" },
    });
    expect(await run(["list"])).toBe(1);
    expect(out.find((l) => l.startsWith("bom "))).toBeDefined();
    expect(out.find((l) => l.startsWith("quebrado "))).toMatch(/\(mal configurado\)$/);
    expect(out.find((l) => l.startsWith("semurl "))).toMatch(/\(mal configurado\)$/);
  });

  it("rejects workers that is not an object of aliases", async () => {
    for (const bad of [["a", "b"], "texto", 7]) {
      out.length = 0;
      err.length = 0;
      put(bad);
      expect(await run(["list"])).toBe(1);
      expect(out).toEqual([]);
      expect(err.join("\n")).toMatch(/inválid/i);
    }
  });

  it("keeps messages in correct UTF-8", async () => {
    put({ a: { url: "http://h", model: "m", token: "t", price: { input: 0, output: 0 } } });
    await run(["list"]);
    const all = out.join("\n") + err.join("\n");
    const bad = [0xfeff, 0xfffd, 0xc3, 0xe2].map((c) => String.fromCharCode(c));
    for (const b of bad) expect(all).not.toContain(b);
  });
});
