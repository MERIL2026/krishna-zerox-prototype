/**
 * build-server.mjs
 * Cross-platform server bundle script using esbuild's JS API.
 * Replaces `node ./node_modules/esbuild/bin/esbuild …` which fails on Linux
 * because the esbuild npm package ships a native ELF binary at that path.
 */
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["server/_core/index.ts"],
  platform: "node",
  packages: "external",
  bundle: true,
  format: "esm",
  outdir: "dist",
});

console.log("Server bundle written to dist/index.js");
