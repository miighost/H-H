import { build } from "esbuild";
import { mkdir, cp } from "node:fs/promises";
await mkdir("worker-build/client", { recursive: true });
await cp("dist", "worker-build/client", { recursive: true });
await mkdir("worker-build/server", { recursive: true });
await build({
  entryPoints: ["worker/index.mjs"],
  outfile: "worker-build/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
});
