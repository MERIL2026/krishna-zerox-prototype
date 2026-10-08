/**
 * build-server.mjs
 * Cross-platform server bundle script using esbuild's JS API.
 * Builds both dist/index.js (standalone server) and api/handler.js (Vercel serverless).
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

await esbuild.build({
  entryPoints: ["server/apiHandler.ts"],
  platform: "node",
  packages: "external",
  bundle: true,
  format: "esm",
  outfile: "api/handler.js",
});

console.log("Server bundle written to dist/index.js and api/handler.js");
