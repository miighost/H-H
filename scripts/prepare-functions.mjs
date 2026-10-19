import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(root, "..");
const dest = path.join(project, "functions", "runtime");

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const out = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(src, out);
    else await fs.copyFile(src, out);
  }
}

await fs.rm(dest, { recursive: true, force: true });
await copyDir(path.join(project, "backend", "runtime"), dest);
console.log("Prepared functions/runtime from backend/runtime");
