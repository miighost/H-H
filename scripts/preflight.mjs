import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_APP_ID",
  "PUBLIC_BASE_URL",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing configuration: " + missing.join(", "));
  process.exit(1);
}
try {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!encoded && !credentialPath)
    throw Error(
      "Missing Firebase Admin credentials: set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS.",
    );
  const service = encoded
    ? JSON.parse(Buffer.from(encoded, "base64").toString())
    : JSON.parse(await fs.readFile(path.resolve(credentialPath), "utf8"));
  if (service.project_id !== process.env.VITE_FIREBASE_PROJECT_ID)
    throw Error("Browser and server Firebase project IDs must match.");
  if (new URL(process.env.PUBLIC_BASE_URL).protocol !== "https:")
    throw Error("PUBLIC_BASE_URL must use HTTPS.");
  if (process.env.DATA_BACKEND === "sqlite") {
    if (Number(process.versions.node.split(".")[0]) < 24)
      throw Error("Own-server SQLite deployment requires Node 24 LTS.");
    const dir = path.resolve(process.env.DATA_DIRECTORY || "var");
    await fs.mkdir(dir, { recursive: true });
    await fs.access(dir, 2);
  }
  if (process.env.PAYMENTS_COMMISSIONED === "true") {
    for (const k of [
      "WAAFI_MERCHANT_UID",
      "WAAFI_STORE_ID",
      "WAAFI_HPP_KEY",
      "WAAFI_WEBHOOK_SECRET",
    ])
      if (!process.env[k])
        throw Error("Payment configuration is incomplete: " + k);
  }
  console.log(
    "Configuration preflight passed. This does not verify live merchant credentials or devices.",
  );
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
