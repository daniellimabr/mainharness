// Bundles the hx CLI into a single file so the plugin runs without npm install.
import { build } from "esbuild";

await build({
  entryPoints: ["cli/src/index.ts"],
  outfile: "cli/dist/hx.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  legalComments: "none",
  logLevel: "warning",
});
