import esbuild from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, "src");

const stubDbContents = `export function getDb() { return null; } export function saveDb() {} export async function initDb() {}`;

const replacePlugin = {
  name: "replace-queries-and-db",
  setup(build) {
    build.onLoad({ filter: /queries\.ts$/ }, async (args) => {
      if (args.path.includes("cloudflare") || args.path.includes("d1-queries") || args.path.includes("stubs")) return null;
      const contents = readFileSync(resolve(srcDir, "cloudflare/d1-queries.ts"), "utf-8");
      return { contents, loader: "ts" };
    });

    build.onLoad({ filter: /database\.ts$/ }, async (args) => {
      if (args.path.includes("cloudflare") || args.path.includes("stubs")) return null;
      return { contents: stubDbContents, loader: "js" };
    });
  },
};

await esbuild.build({
  entryPoints: [resolve(srcDir, "cloudflare/index.ts")],
  bundle: true,
  minify: true,
  platform: "neutral",
  target: "es2022",
  outfile: resolve(__dirname, "dist/worker.mjs"),
  format: "esm",
  treeShaking: true,
  sourcemap: false,
  plugins: [replacePlugin],
  alias: {
    "fs": resolve(srcDir, "stubs/empty.ts"),
    "path": resolve(srcDir, "stubs/empty.ts"),
    "node:fs": resolve(srcDir, "stubs/empty.ts"),
    "node:path": resolve(srcDir, "stubs/empty.ts"),
    "node:url": resolve(srcDir, "stubs/empty.ts"),
    "url": resolve(srcDir, "stubs/empty.ts"),
    "crypto": resolve(srcDir, "stubs/crypto.ts"),
    "node:crypto": resolve(srcDir, "stubs/crypto.ts"),
    "sql.js": resolve(srcDir, "stubs/empty.ts"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

console.log("Worker build complete: dist/worker.mjs");
