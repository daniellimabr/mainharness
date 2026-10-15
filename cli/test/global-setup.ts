// Builds cli/dist/hx.js once before the suite, so integration tests run the real bundle.
import { execFileSync } from "node:child_process";
import * as path from "node:path";

export default function setup(): void {
  const root = path.resolve(__dirname, "..", "..");
  execFileSync(process.execPath, [path.join(root, "cli", "build.mjs")], {
    cwd: root,
    stdio: "inherit",
  });
}
