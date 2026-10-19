import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs/promises";
import path from "node:path";
const dir = path.resolve(process.env.DATA_DIRECTORY || "var"),
  target = path.resolve(process.argv[2] || "");
if (!process.argv[2])
  throw Error(
    "Supply a private backup directory outside the public document root.",
  );
if (
  target === dir ||
  target.startsWith(dir + path.sep) ||
  target.startsWith(path.resolve("public") + path.sep) ||
  target.startsWith(path.resolve("dist") + path.sep)
)
  throw Error(
    "Backup destination must be outside live data and public folders.",
  );
await fs.mkdir(target, { recursive: true });
const db = new DatabaseSync(path.join(dir, "horn-harvest.sqlite"));
const output = path.join(
  target,
  "horn-harvest-" + new Date().toISOString().replace(/[:.]/g, "-") + ".sqlite",
);
db.exec("VACUUM INTO '" + output.replaceAll("'", "''") + "'");
db.close();
await fs
  .cp(path.join(dir, "proof"), path.join(target, "proof"), { recursive: true })
  .catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
console.log(
  "Database and proof backup saved. Back up the environment separately and privately.",
);
