import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/model", { recursive: true });
await cp("src", "dist", { recursive: true, force: true });
await build({
  entryPoints: ["src/converter-component.js"],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: "iife",
  outfile: "dist/converter-component.js",
  alias: { "note-model": "@spotify/basic-pitch" },
  define: { "process.env.NODE_ENV": '"production"' }
});
await cp("node_modules/@spotify/basic-pitch/model/model.json", "dist/model/model.json");
await cp("node_modules/@spotify/basic-pitch/model/group1-shard1of1.bin", "dist/model/group1-shard1of1.bin");

