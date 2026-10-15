import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["cli/test/**/*.test.ts"],
    globalSetup: ["cli/test/global-setup.ts"],
    testTimeout: 30000,
    pool: "forks",
    env: { HARNESS_NO_PATH: "1" }, // never touch the real user PATH from tests
  },
});
