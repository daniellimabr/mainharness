import { build } from "esbuild";

await build({
  entryPoints: ["extension/src/extension.ts"],
  outfile: "extension/dist/extension.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"],
});
