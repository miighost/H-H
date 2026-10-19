import express from "express";
import crypto from "node:crypto";
import { catalog, Fault, text, integer } from "./domain.mjs";
export function publicRequests({ db }) {
  const r = express.Router(),
    attempts = new Map();
  r.get("/prices", async (req, res) => {
    if (!db)
      return res
        .status(503)
        .json({ error: "Price configuration unavailable." });
    try {
      const d = await db.collection("hhSettings").doc("retail-pricing").get();
      res.json(d.exists ? d.data() : { approved: false });
    } catch {
      res.status(503).json({ error: "Price configuration unavailable." });
    }
  });
  r.post("/requests", express.json({ limit: "16kb" }), async (req, res) => {
    try {
      if (!db) throw new Fault("Sales request storage is not configured.", 503);
      const key = String(req.ip),
        now = Date.now();
      for (const [ip, ts] of attempts)
        if (now - ts > 60000) attempts.delete(ip);
      if (attempts.has(key))
        throw new Fault("Please wait a minute before another request.", 429);
      attempts.set(key, now);
      const kind = req.body.kind;
      if (
        !["Retail enquiry", "Trade application", "Client enquiry"].includes(
          kind,
        )
      )
        throw new Fault("Invalid request kind.");
      const name = text(req.body.name, 150),
        phone = text(req.body.phone, 40),
        address = text(req.body.address, 500),
        company = text(req.body.company || name, 150);
      let items = [];
      if (kind === "Retail enquiry") {
        if (
          !Array.isArray(req.body.items) ||
          req.body.items.length > 5 ||
          !req.body.items.length
        )
          throw new Fault("Select products.");
        items = req.body.items.map((i) => {
          if (!catalog.some((p) => p.id === i.productId))
            throw new Fault("Unknown product.");
          return { productId: i.productId, pouches: integer(i.pouches, 1) };
        });
      }
      const ref = db.collection("hhProspects").doc();
      await ref.set({
        company,
        contactName: name,
        phone,
        address,
        kind,
        items,
        stage: "New request",
        notes: String(
          req.body.notes ||
            "Website submission; stock, pricing and customer terms require confirmation.",
        ).slice(0, 2000),
        updatedAt: new Date().toISOString(),
        source: "Website",
      });
      res.status(201).json({
        requestId: ref.id,
        message:
          "Your request has been received. Our sales team will contact you.",
      });
    } catch (e) {
      res
        .status(e.status || 400)
        .json({ error: e.status ? e.message : "Invalid request." });
    }
  });
  return r;
}
