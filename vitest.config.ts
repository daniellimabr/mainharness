import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["cli/test/**/*.test.ts"],
    testTimeout: 30000,
    pool: "forks",
  },
});
