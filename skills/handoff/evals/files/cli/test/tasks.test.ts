import { expect, test } from "vitest";
import { parseTasks } from "../src/sprint/tasks";

test("parses task rows", () => {
  const md = "| T01 | Parser | tech-lead | a.ts, b.ts | 30 min |";
  expect(parseTasks(md)).toEqual([{ id: "T01", title: "Parser", files: ["a.ts", "b.ts"] }]);
});
