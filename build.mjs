import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  platform: "node",
  target: "node20",
  outfile: "dist/bot.mjs",
  format: "esm",
  external: [],
  treeShaking: true,
  sourcemap: false,
});

console.log("Build complete: dist/bot.mjs");
