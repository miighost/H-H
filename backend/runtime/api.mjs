import express from "express";
import { refreshOperationalAlerts } from "./logistics.mjs";
import { advancedRoutes } from "./advanced.mjs";
import { paymentRoutes } from "./payments.mjs";
import crypto from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import {
  catalog,
  Fault,
  integer,
  text,
  createOrder,
  transition,
} from "./domain.mjs";
export function operationsApi({ db, auth, storage = getStorage }) {
  const r = express.Router();
  r.use(express.json({ limit: "8mb" }));
  r.use(async (req, res, next) => {
    try {
      if (!db || !auth)
        throw new Fault(
          "Server database and identity configuration is required.",
          503,
        );
      const token = String(req.headers.authorization || "").replace(
        /^Bearer /,
        "",
      );
      if (!token) throw new Fault("Sign in to continue.", 401);
      req.identity = await auth.verifyIdToken(token, true);
      req.role = req.identity.hhRole || "customer";
      if (
        ![
          "customer",
          "warehouse",
          "driver",
          "sales",
          "admin",
          "ceo",
          "staff",
        ].includes(req.role)
      )
        throw new Fault("This account role is not configured.", 403);
      if (
        req.role === "ceo" &&
        (req.identity.email !== process.env.CEO_AUTHORISED_EMAIL ||
          !req.identity.email_verified)
      )
        throw new Fault("Verified authorised CEO identity is required.", 403);
      next();
    } catch (e) {
      res.status(e.status || 401).json({
        error: e.status ? e.message : "Your session could not be verified.",
      });
    }
  });
  const safe = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error("Operations API", e.message);
      res.status(e.status || 500).json({
        error: e.status
          ? e.message
          : "The record could not be saved. Please retry.",
      });
    }
  };
  const staff = (req) => {
    if (!["admin", "ceo", "warehouse", "sales"].includes(req.role))
      throw new Fault("Staff access is required.", 403);
  };
  const owner = (req) => {
    if (!["admin", "ceo"].includes(req.role))
      throw new Fault("Administrator access is required.", 403);
  };
  const allowed = (req, o) => {
    if (req.role === "staff")
      throw new Fault("Order access is not available to this staff role.", 403);
    if (req.role === "customer" && o.customerUid !== req.identity.uid)
      throw new Fault("This order is not yours.", 403);
    if (req.role === "driver" && o.driverUid !== req.identity.uid)
      throw new Fault("This delivery is not assigned to you.", 403);
  };
  const accountRef = (uid) => db.collection("hhAccounts").doc(uid);
  const now = () => new Date().toISOString();
  r.get(
    "/workspace",
    safe(async (req, res) => {
      const q = ["customer", "staff"].includes(req.role)
        ? db.collection("hhOrders").where("customerUid", "==", req.identity.uid)
        : req.role === "driver"
          ? db.collection("hhOrders").where("driverUid", "==", req.identity.uid)
          : db.collection("hhOrders");
      const [orders, stocks, account, payments, equipment] = await Promise.all([
        q.get(),
        db.collection("hhInventory").get(),
        accountRef(req.identity.uid).get(),
        (["driver", "staff"].includes(req.role)
          ? db.collection("hhPayments").where("customerUid", "==", "__none__")
          : req.role === "customer"
            ? db
                .collection("hhPayments")
                .where("customerUid", "==", req.identity.uid)
            : db.collection("hhPayments")
        ).get(),
        (["driver", "staff"].includes(req.role)
          ? db
              .collection("hhEquipment")
              .where("holderUid", "==", req.identity.uid)
          : req.role === "customer"
            ? db
                .collection("hhEquipment")
                .where("holderUid", "==", req.identity.uid)
            : db.collection("hhEquipment")
        ).get(),
      ]);
      const profiles = ["admin", "ceo", "warehouse", "sales"].includes(req.role)
        ? await db.collection("hhAccounts").get()
        : null;
      res.json({
        role: req.role,
        uid: req.identity.uid,
        catalog,
        account: account.exists
          ? account.data()
          : { balanceCents: 0, creditLimitCents: 0 },
        orders: orders.docs
          .map((d) => ({ id: d.id, ...d.data(), proofPath: undefined }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        inventory: stocks.docs.map((d) => ({ productId: d.id, ...d.data() })),
        payments: payments.docs.map((d) => ({ id: d.id, ...d.data() })),
        equipment: equipment.docs.map((d) => ({ id: d.id, ...d.data() })),
        accounts: profiles?.docs.map((d) => ({ uid: d.id, ...d.data() })) || [],
      });
    }),
  );
  r.post(
    "/account",
    safe(async (req, res) => {
      const data = {
        contactName: text(req.body.contactName, 150),
        company: text(req.body.company, 150),
        address: text(req.body.address),
        phone: text(req.body.phone, 40),
        email: req.identity.email || "",
        updatedAt: now(),
      };
      await db.runTransaction(async (t) => {
        const ref = accountRef(req.identity.uid),
          d = await t.get(ref);
        t.set(ref, {
          balanceCents: 0,
          creditLimitCents: 0,
          ...(d.exists ? d.data() : {}),
          ...data,
        });
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/orders",
    safe(async (req, res) => {
      if (!["customer", "sales", "admin", "ceo"].includes(req.role))
        throw new Fault("Customer or sales account required.", 403);
      const customerUid =
        req.role === "customer"
          ? req.identity.uid
          : text(req.body.customerUid, 150);
      const key = text(req.get("Idempotency-Key"), 100);
      if (!/^[\w-]+$/.test(key)) throw new Fault("Invalid request key.");
      const ref = db.collection("hhOrders").doc(
        crypto
          .createHash("sha256")
          .update(customerUid + ":" + key)
          .digest("hex")
          .slice(0, 24),
      );
      const fingerprint = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            items: req.body.items,
            address: req.body.address,
            onCredit: Boolean(req.body.onCredit),
          }),
        )
        .digest("hex");
      const order = await db.runTransaction(async (t) => {
        const prior = await t.get(ref);
        if (prior.exists) {
          if (prior.data().requestFingerprint !== fingerprint)
            throw new Fault(
              "Request key was already used for another order.",
              409,
            );
          return { id: ref.id, ...prior.data() };
        }
        const ar = accountRef(customerUid);
        const a = await t.get(ar);
        if (!a.exists)
          throw new Fault("Save your business account details first.", 409);
        const refs = catalog.map((p) => db.collection("hhInventory").doc(p.id));
        const snapshots = await Promise.all(refs.map((x) => t.get(x)));
        const inventory = Object.fromEntries(
          snapshots.map((d, i) => [catalog[i].id, d.exists ? d.data() : null]),
        );
        const o = createOrder(
          req.body,
          inventory,
          { ...req.identity, uid: customerUid },
          a.data(),
          ref.id,
          now(),
        );
        for (const line of o.lines) {
          const index = catalog.findIndex((p) => p.id === line.productId);
          t.set(refs[index], {
            ...inventory[line.productId],
            reservedBoxes: inventory[line.productId].reservedBoxes + line.boxes,
          });
        }
        o.requestFingerprint = fingerprint;
        o.createdBy = req.identity.uid;
        t.set(ref, o);
        t.set(
          ar,
          { balanceCents: (a.data().balanceCents || 0) + o.totalCents },
          { merge: true },
        );
        return o;
      });
      await refreshOperationalAlerts(db);
      res.status(201).json({ order });
    }),
  );
  r.get(
    "/orders/:id",
    safe(async (req, res) => {
      const doc = await db.collection("hhOrders").doc(req.params.id).get();
      if (!doc.exists) throw new Fault("Order not found.", 404);
      allowed(req, doc.data());
      res.json({ order: { id: doc.id, ...doc.data(), proofPath: undefined } });
    }),
  );
  r.post(
    "/orders/:id/assign",
    safe(async (req, res) => {
      staff(req);
      const driverUid = text(req.body.driverUid, 150);
      const driver = await auth.getUser(driverUid);
      if (driver.customClaims?.hhRole !== "driver")
        throw new Fault("Select an authorised driver.");
      const start = Date.parse(req.body.windowStart),
        end = Date.parse(req.body.windowEnd);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        throw new Fault("Enter a valid delivery window.");
      await db.runTransaction(async (t) => {
        const ref = db.collection("hhOrders").doc(req.params.id),
          d = await t.get(ref);
        if (!d.exists) throw new Fault("Order not found.", 404);
        if (
          ["Delivered", "Cancelled", "Left warehouse", "Arrived"].includes(
            d.data().status,
          )
        )
          throw new Fault("This order cannot be reassigned.", 409);
        t.update(ref, {
          driverUid,
          driverName: driver.displayName || driver.email || "Driver",
          windowStart: new Date(start).toISOString(),
          windowEnd: new Date(end).toISOString(),
        });
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/orders/:id/status",
    safe(async (req, res) => {
      let proofPath = null;
      if (req.body.status === "Delivered") {
        const d = await db.collection("hhOrders").doc(req.params.id).get();
        if (!d.exists) throw new Fault("Order not found.", 404);
        allowed(req, d.data());
        if (d.data().status !== "Arrived")
          throw new Fault("Mark arrival before completing delivery.", 409);
        if (!["driver", "admin", "ceo"].includes(req.role))
          throw new Fault("Driver access is required.", 403);
        const m = String(req.body.photo || "").match(
          /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/,
        );
        if (!m) throw new Fault("A delivery photo is required.");
        const bytes = Buffer.from(m[2], "base64");
        if (bytes.length > 5 * 1024 * 1024 || bytes.length < 30)
          throw new Fault("Photo must be under 5 MB.");
        const bucket = process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET;
        if (!bucket)
          throw new Fault("Delivery photo storage is not configured.", 503);
        proofPath = `delivery-proof/${req.params.id}/${crypto.randomUUID()}.${m[1]}`;
        await storage()
          .bucket(bucket)
          .file(proofPath)
          .save(bytes, { resumable: false, contentType: `image/${m[1]}` });
      }
      const result = await db.runTransaction(async (t) => {
        const ref = db.collection("hhOrders").doc(req.params.id),
          d = await t.get(ref);
        if (!d.exists) throw new Fault("Order not found.", 404);
        const o = d.data();
        allowed(req, o);
        const updated = transition(
          o,
          req.body.status,
          req.identity,
          req.role,
          { ...req.body, proofPath },
          now(),
        );
        const refs = o.lines.map((l) =>
          db.collection("hhInventory").doc(l.productId),
        );
        const stocks =
          req.body.status === "Left warehouse"
            ? await Promise.all(refs.map((x) => t.get(x)))
            : [];
        stocks.forEach((s, i) => {
          const line = o.lines[i],
            stock = s.data();
          if (
            !stock ||
            stock.onHandBoxes < line.boxes ||
            stock.reservedBoxes < line.boxes
          )
            throw new Fault(
              "Reserved stock is inconsistent. Contact warehouse.",
              409,
            );
          t.update(refs[i], {
            onHandBoxes: stock.onHandBoxes - line.boxes,
            reservedBoxes: stock.reservedBoxes - line.boxes,
          });
        });
        t.set(ref, updated);
        return updated;
      });
      await refreshOperationalAlerts(db);
      res.json({ order: { ...result, proofPath: undefined } });
    }),
  );
  r.get(
    "/orders/:id/proof",
    safe(async (req, res) => {
      const d = await db.collection("hhOrders").doc(req.params.id).get();
      if (!d.exists) throw new Fault("Order not found.", 404);
      allowed(req, d.data());
      if (!d.data().proofPath) throw new Fault("No delivery proof yet.", 404);
      const [bytes] = await storage()
        .bucket(process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET)
        .file(d.data().proofPath)
        .download();
      res.type("image/" + d.data().proofPath.split(".").pop()).send(bytes);
    }),
  );
  r.post(
    "/payments",
    safe(async (req, res) => {
      owner(req);
      const customerUid = text(req.body.customerUid, 150),
        amountCents = integer(req.body.amountCents, 1),
        reference = text(req.body.reference, 150);
      const id = crypto.createHash("sha256").update(reference).digest("hex");
      await db.runTransaction(async (t) => {
        const pr = db.collection("hhPayments").doc(id),
          existing = await t.get(pr);
        if (existing.exists) {
          if (
            existing.data().amountCents !== amountCents ||
            existing.data().customerUid !== customerUid ||
            (existing.data().orderId || null) !== (req.body.orderId || null)
          )
            throw new Fault(
              "Reference already used for a different payment.",
              409,
            );
          return;
        }
        const ar = accountRef(customerUid),
          a = await t.get(ar);
        if (!a.exists) throw new Fault("Customer account not found.", 404);
        let or, order;
        if (req.body.orderId) {
          or = db.collection("hhOrders").doc(text(req.body.orderId, 100));
          const d = await t.get(or);
          if (!d.exists || d.data().customerUid !== customerUid)
            throw new Fault("Payment order does not match customer.");
          order = d.data();
          if (order.paidCents + amountCents > order.totalCents)
            throw new Fault(
              "Payment exceeds order balance. Record excess as account deposit.",
            );
        }
        t.set(pr, {
          customerUid,
          orderId: req.body.orderId || null,
          amountCents,
          reference,
          at: now(),
          recordedBy: req.identity.uid,
          method: "Verified external receipt",
        });
        t.update(ar, {
          balanceCents: (a.data().balanceCents || 0) - amountCents,
        });
        if (or) t.update(or, { paidCents: order.paidCents + amountCents });
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/orders/:id/apply-credit",
    safe(async (req, res) => {
      await db.runTransaction(async (t) => {
        const ref = db.collection("hhOrders").doc(req.params.id),
          d = await t.get(ref);
        if (!d.exists) throw new Fault("Order not found.", 404);
        const o = d.data();
        allowed(req, o);
        if (!["customer", "admin", "ceo"].includes(req.role))
          throw new Fault("Account access required.", 403);
        const ar = accountRef(o.customerUid),
          a = await t.get(ar);
        const other = await t.get(
          db.collection("hhOrders").where("customerUid", "==", o.customerUid),
        );
        const outstanding = other.docs.reduce(
          (s, x) => s + Math.max(0, x.data().totalCents - x.data().paidCents),
          0,
        );
        const unallocated = Math.max(
          0,
          outstanding - (a.data()?.balanceCents || 0),
        );
        const amount = Math.min(o.totalCents - o.paidCents, unallocated);
        if (amount <= 0)
          throw new Fault("No unallocated account credit is available.", 409);
        t.update(ref, { paidCents: o.paidCents + amount });
        const pr = db.collection("hhPayments").doc();
        t.set(pr, {
          customerUid: o.customerUid,
          orderId: o.id,
          amountCents: amount,
          reference: "Account credit allocation " + pr.id,
          at: now(),
          recordedBy: req.identity.uid,
          method: "Account credit allocation",
          allocationOnly: true,
        });
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/inventory/:id",
    safe(async (req, res) => {
      staff(req);
      if (!catalog.some((p) => p.id === req.params.id))
        throw new Fault("Unknown product.");
      if (!["warehouse", "admin", "ceo"].includes(req.role))
        throw new Fault("Warehouse access required.", 403);
      const boxes = integer(req.body.onHandBoxes),
        priceCents = integer(req.body.priceCents, 1),
        threshold = integer(req.body.threshold);
      const tiers = req.body.tiers || [];
      if (!Array.isArray(tiers) || tiers.length > 10)
        throw new Fault("Invalid quantity price tiers.");
      tiers.forEach((t) => {
        integer(t.minimumBoxes, 2);
        integer(t.priceCents, 1);
      });
      await db.runTransaction(async (t) => {
        const ref = db.collection("hhInventory").doc(req.params.id),
          d = await t.get(ref),
          reserved = d.data()?.reservedBoxes || 0;
        if (boxes < reserved)
          throw new Fault("Physical stock cannot be below reserved stock.");
        t.set(ref, {
          onHandBoxes: boxes,
          reservedBoxes: reserved,
          priceCents,
          threshold,
          tiers,
          updatedAt: now(),
          updatedBy: req.identity.uid,
        });
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/accounts/:uid/credit",
    safe(async (req, res) => {
      owner(req);
      await accountRef(req.params.uid).set(
        {
          creditLimitCents: integer(req.body.creditLimitCents),
          updatedBy: req.identity.uid,
        },
        { merge: true },
      );
      res.json({ ok: true });
    }),
  );
  r.post(
    "/equipment",
    safe(async (req, res) => {
      staff(req);
      const holderUid = req.body.holderUid
        ? text(req.body.holderUid, 150)
        : null;
      const data = {
        name: text(req.body.name, 150),
        quantity: integer(req.body.quantity, 1),
        holderUid,
        ownership: text(req.body.ownership, 100),
        updatedAt: now(),
        updatedBy: req.identity.uid,
      };
      const ref = req.body.id
        ? db.collection("hhEquipment").doc(text(req.body.id, 100))
        : db.collection("hhEquipment").doc();
      await ref.set(data);
      res.json({ id: ref.id });
    }),
  );
  r.post("/orders/:id/location", (req, _res, next) => {
    req.url = `/orders/${req.params.id}/locations`;
    req.body = {
      events: [
        { ...req.body, eventId: crypto.randomUUID(), capturedAt: now() },
      ],
    };
    next();
  });
  r.get(
    "/prospects",
    safe(async (req, res) => {
      if (!["admin", "ceo", "sales"].includes(req.role))
        throw new Fault("Sales access required.", 403);
      const rows = await db.collection("hhProspects").get();
      res.json({
        prospects: rows.docs.map((d) => ({ id: d.id, ...d.data() })),
      });
    }),
  );
  r.post(
    "/prospects",
    safe(async (req, res) => {
      if (!["admin", "ceo", "sales"].includes(req.role))
        throw new Fault("Sales access required.", 403);
      const data = {
        company: text(req.body.company, 150),
        contactName: text(req.body.contactName, 150),
        phone: text(req.body.phone, 40),
        stage: text(req.body.stage, 100),
        notes: String(req.body.notes || "").slice(0, 2000),
        updatedAt: now(),
        updatedBy: req.identity.uid,
      };
      const ref = req.body.id
        ? db.collection("hhProspects").doc(text(req.body.id, 100))
        : db.collection("hhProspects").doc();
      await ref.set(data);
      res.json({ id: ref.id });
    }),
  );
  advancedRoutes(r, { db, auth, storage, safe, allowed });
  paymentRoutes(r, { db, safe, allowed });
  r.use((_req, res) =>
    res.status(404).json({ error: "API endpoint not found." }),
  );
  return r;
}
