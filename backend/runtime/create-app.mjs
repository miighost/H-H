import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  cert,
  getApps,
  initializeApp as initializeAdminApp,
} from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { publicRequests } from "./public-requests.mjs";
import { operationsApi } from "./api.mjs";
import {
  paymentWebhooks,
  processPaymentEvents,
} from "./payments.mjs";
import {
  refreshOperationalAlerts,
  refreshAbsences,
} from "./logistics.mjs";

/**
 * Build the Horn & Harvest Express application.
 * On Cloud Functions / GCP, Admin SDK uses Application Default Credentials
 * (no local service-account JSON required).
 */
export async function createApp({
  serveStatic = false,
  root = path.dirname(fileURLToPath(import.meta.url)),
} = {}) {
  const app = express();
  app.disable("x-powered-by");

  let adminDb = null;
  let adminAuth = null;
  let proofStorage;

  try {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const serviceAccount = encoded
      ? JSON.parse(Buffer.from(encoded, "base64").toString("utf8"))
      : null;
    const projectId =
      serviceAccount?.project_id ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      process.env.VITE_FIREBASE_PROJECT_ID ||
      "hornandharvest";
    // Cloud Functions / GCP: ADC (no local Admin JSON). Optional: FIREBASE_SERVICE_ACCOUNT_BASE64.
    const adminApp =
      getApps()[0] ||
      initializeAdminApp(
        serviceAccount
          ? { credential: cert(serviceAccount), projectId }
          : { projectId },
      );
    adminDb = getAdminFirestore(adminApp);
    adminAuth = getAdminAuth(adminApp);
  } catch (error) {
    console.warn(
      "Trade services are waiting for Firebase server credentials.",
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  if (process.env.DATA_BACKEND === "sqlite") {
    const { LocalStore, localFileStorage } = await import("./local-store.mjs");
    const projectRoot = serveStatic
      ? root
      : path.resolve(root, "../..");
    adminDb = new LocalStore(
      process.env.DATA_DIRECTORY
        ? path.join(process.env.DATA_DIRECTORY, "horn-harvest.sqlite")
        : path.join(projectRoot, "var", "horn-harvest.sqlite"),
    );
    proofStorage = localFileStorage(
      path.join(
        process.env.DATA_DIRECTORY || path.join(projectRoot, "var"),
        "proof",
      ),
    );
    process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET = "local";
  }

  if (!process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET) {
    process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET =
      process.env.VITE_FIREBASE_STORAGE_BUCKET ||
      process.env.FIREBASE_STORAGE_BUCKET ||
      "hornandharvest.firebasestorage.app";
  }
  if (!process.env.CEO_AUTHORISED_EMAIL) {
    process.env.CEO_AUTHORISED_EMAIL = "info@hornandharvest.com";
  }
  if (!process.env.PUBLIC_BASE_URL) {
    process.env.PUBLIC_BASE_URL = "https://hornandharvest.web.app";
  }

  // Raw webhook bytes must be captured before the global JSON parser.
  app.use("/api", (req, res, next) =>
    paymentWebhooks({ db: adminDb })(req, res, next),
  );
  app.use(express.json({ limit: "8mb" }));
  if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY);

  app.use("/api/public", publicRequests({ db: adminDb }));
  app.use(
    "/api/operations",
    operationsApi({
      db: adminDb,
      auth: adminAuth,
      ...(proofStorage ? { storage: proofStorage } : {}),
    }),
  );

  let sweeping = false;
  const timer = setInterval(async () => {
    if (!adminDb || sweeping) return;
    sweeping = true;
    try {
      await refreshOperationalAlerts(adminDb);
      await refreshAbsences(adminDb);
      await processPaymentEvents(adminDb);
    } catch (e) {
      console.error("Operational scheduler:", e.message);
    } finally {
      sweeping = false;
    }
  }, 30000);
  if (typeof timer.unref === "function") timer.unref();

  app.get("/api/health", (_req, res) =>
    res.json({
      service: "Horn & Harvest",
      databaseConfigured: Boolean(adminDb && adminAuth),
      backend: process.env.DATA_BACKEND || "firestore",
    }),
  );

  app.post("/api/waafi/checkout", (_req, res) =>
    res.status(410).json({
      error: "Sign in and create an order before paying.",
      signIn: "/customer/new-order",
    }),
  );

  if (serveStatic) {
    app.use(
      express.static(path.join(root, "dist"), { maxAge: "1d", etag: true }),
    );
    app.get(["/payment/success", "/payment/failure"], (_request, response) =>
      response.sendFile(path.join(root, "dist", "index.html")),
    );
  }

  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API endpoint not found." }),
  );

  if (serveStatic) {
    app.get("*", (_request, response) =>
      response.sendFile(path.join(root, "dist", "index.html")),
    );
  }

  return { app, adminDb, adminAuth };
}

// Keep crypto available for any runtime that expects the previous import side-effect.
void crypto;
