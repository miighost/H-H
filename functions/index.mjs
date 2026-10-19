import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { createApp } from "./runtime/create-app.mjs";

setGlobalOptions({
  region: "us-central1",
  maxInstances: 20,
});

// Cloud Functions use Application Default Credentials — no local Admin JSON.
process.env.PUBLIC_BASE_URL ||= "https://hornandharvest.web.app";
process.env.CEO_AUTHORISED_EMAIL ||= "info@hornandharvest.com";
process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET ||=
  "hornandharvest.firebasestorage.app";
process.env.TRUST_PROXY ||= "true";
delete process.env.DATA_BACKEND;

const { app } = await createApp({ serveStatic: false });

export const api = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 120,
    cors: false,
    invoker: "public",
  },
  app,
);
