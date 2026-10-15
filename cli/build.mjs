// Bundles the hx CLI into a single file so the plugin runs without npm install.
// Writes to a temp file and renames, so parallel builds never leave a torn hx.js.
import { build } from "esbuild";
import { renameSync } from "node:fs";

const out = "cli/dist/hx.js";
const tmp = `${out}.${process.pid}.tmp`;

await build({
  entryPoints: ["cli/src/index.ts"],
  outfile: tmp,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  legalComments: "none",
  logLevel: "warning",
});
renameSync(tmp, out);
