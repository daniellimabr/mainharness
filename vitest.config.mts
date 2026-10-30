import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["cli/test/**/*.test.ts"],
    globalSetup: ["cli/test/global-setup.ts"],
    testTimeout: 30000,
    pool: "forks",
    // 3 workers: more crashed the suite on S15 (B138)
    maxWorkers: 3,
    // never touch the real user PATH nor call the real usage endpoint from tests
    env: { HARNESS_NO_PATH: "1", HARNESS_NO_LIMITS: "1" },
  },
});
