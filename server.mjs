import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./backend/runtime/create-app.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const { app } = await createApp({ serveStatic: true, root });

app.listen(Number(process.env.PORT || 3000), () =>
  console.log("Horn & Harvest website ready"),
);
