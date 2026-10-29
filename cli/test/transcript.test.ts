import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEvents } from "../src/events/emit";
import { home } from "../src/core/paths";
import { ingestSession } from "../src/usage";
import { isolateHome, rm, tempDir } from "./helpers";

let env: ReturnType<typeof isolateHome>;
let dir: string;
beforeEach(() => {
  env = isolateHome();
  dir = tempDir("hx transcript dedupe");
});
afterEach(() => {
  env.cleanup();
  rm(dir);
});

const line = (id: string) =>
  JSON.stringify({
    type: "assistant",
    timestamp: "2026-10-15T11:00:00.000Z",
    message: {
      id,
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  });

describe("transcript usage dedupe", () => {
  it("writes one usage per message_id, also when re-ingested without cache", () => {
    const file = path.join(dir, "s1.jsonl");
    fs.writeFileSync(file, [line("m1"), line("m1"), line("m2")].join("\n") + "\n");
    const opts = { transcriptPath: file, sessionId: "s1", project: "p", sprint: null };
    expect(ingestSession(opts).events).toBe(2);
    rm(home.usageCache());
    expect(ingestSession(opts).events).toBe(0);
    const ids = readEvents((e) => e.type === "usage").map((e) => e.data.message_id);
    expect(ids.sort()).toEqual(["m1", "m2"]);
  });
});
