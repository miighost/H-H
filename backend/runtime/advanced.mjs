import crypto from "node:crypto";
import { Fault, integer, text, catalog } from "./domain.mjs";
import {
  coordinates,
  metres,
  routeMatrix,
  sortStops,
  refreshOperationalAlerts,
} from "./logistics.mjs";
const stamp = () => new Date().toISOString();
const gram = (v) => {
  const n = Math.round(Number(v) * 1000);
  return integer(n, 1);
};
const own = (req) => {
  if (!["admin", "ceo"].includes(req.role))
    throw new Fault("Administrator access required.", 403);
};
const warehouse = (req) => {
  if (!["warehouse", "admin", "ceo"].includes(req.role))
    throw new Fault("Warehouse access required.", 403);
};
const sales = (req) => {
  if (!["sales", "admin", "ceo"].includes(req.role))
    throw new Fault("Sales access required.", 403);
};
const rows = async (db, c) => {
  const s = await db.collection(c).get();
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
};
export function advancedRoutes(r, { db, auth, storage, safe, allowed }) {
  r.post(
    "/settings/retail-pricing",
    safe(async (req, res) => {
      own(req);
      const pouchPriceCents = integer(req.body.pouchPriceCents, 1),
        deliveryCents = integer(req.body.deliveryCents);
      await db.collection("hhSettings").doc("retail-pricing").set({
        approved: true,
        pouchPriceCents,
        deliveryCents,
        approvedAt: stamp(),
        approvedBy: req.identity.uid,
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/inventory/:id/tiers",
    safe(async (req, res) => {
      own(req);
      const tiers = req.body.tiers;
      if (!Array.isArray(tiers) || tiers.length > 10)
        throw new Fault("Enter valid quantity tiers.");
      tiers.forEach((t) => {
        integer(t.minimumBoxes, 2);
        integer(t.priceCents, 1);
      });
      const ref = db.collection("hhInventory").doc(req.params.id),
        d = await ref.get();
      if (!d.exists)
        throw new Fault("Configure stock and base price first.", 409);
      await ref.update({ tiers });
      res.json({ ok: true });
    }),
  );
  r.get(
    "/drivers",
    safe(async (req, res) => {
      warehouse(req);
      if (!auth.listUsers)
        throw new Fault("Identity directory is unavailable.", 503);
      let token,
        drivers = [];
      do {
        const page = await auth.listUsers(1000, token);
        drivers.push(
          ...page.users
            .filter((u) => !u.disabled && u.customClaims?.hhRole === "driver")
            .map((u) => ({
              uid: u.uid,
              name: u.displayName || u.email || u.uid,
            })),
        );
        token = page.pageToken;
      } while (token);
      res.json({ drivers });
    }),
  );
  r.get(
    "/staff",
    safe(async (req, res) => {
      own(req);
      if (!auth.listUsers)
        throw new Fault("Identity directory unavailable.", 503);
      const page = await auth.listUsers(1000);
      res.json({
        staff: page.users
          .filter(
            (u) =>
              u.customClaims?.hhRole && u.customClaims.hhRole !== "customer",
          )
          .map((u) => ({
            uid: u.uid,
            name: u.displayName || u.email,
            email: u.email,
            role: u.customClaims.hhRole,
            disabled: u.disabled,
          })),
      });
    }),
  );
  r.post(
    "/staff",
    safe(async (req, res) => {
      own(req);
      const email = text(req.body.email, 200),
        password = text(req.body.password, 200),
        role = text(req.body.role, 30),
        displayName = text(req.body.displayName, 150);
      if (
        !["staff", "warehouse", "driver", "sales"].includes(role) ||
        password.length < 12
      )
        throw new Fault(
          "Select a staff role and a password of at least 12 characters.",
        );
      const user = await auth.createUser({ email, password, displayName });
      await auth.setCustomUserClaims(user.uid, { hhRole: role });
      res.status(201).json({ uid: user.uid });
    }),
  );
  r.post(
    "/staff/:uid/disable",
    safe(async (req, res) => {
      own(req);
      if (req.params.uid === req.identity.uid)
        throw new Fault("You cannot disable your own session.");
      await auth.updateUser(req.params.uid, { disabled: true });
      await auth.revokeRefreshTokens(req.params.uid);
      res.json({ ok: true });
    }),
  );
  r.get(
    "/modules",
    safe(async (req, res) => {
      const visible = ["admin", "ceo", "warehouse", "sales"].includes(req.role);
      const [
        alerts,
        attendance,
        raw,
        intakes,
        batches,
        visits,
        trials,
        notes,
        expenses,
        forecasts,
      ] = await Promise.all(
        [
          "hhAlerts",
          "hhAttendance",
          "hhRawInventory",
          "hhIntakes",
          "hhBatches",
          "hhVisits",
          "hhTrials",
          "hhExecutiveNotes",
          "hhExpenses",
          "hhForecasts",
        ].map((c) => rows(db, c)),
      );
      res.json({
        alerts: alerts.filter(
          (a) =>
            a.roles?.includes(req.role) || a.customerUid === req.identity.uid,
        ),
        attendance: attendance
          .filter(
            (a) =>
              ["admin", "ceo", "warehouse"].includes(req.role) ||
              a.uid === req.identity.uid,
          )
          .map(({ photoPath, ...a }) => a),
        raw: visible ? raw : [],
        intakes: ["admin", "ceo", "warehouse"].includes(req.role)
          ? intakes
          : [],
        batches: ["admin", "ceo", "warehouse"].includes(req.role)
          ? batches
          : [],
        visits: ["admin", "ceo", "sales"].includes(req.role) ? visits : [],
        trials: ["admin", "ceo", "sales", "warehouse"].includes(req.role)
          ? trials
          : [],
        notes: ["admin", "ceo"].includes(req.role) ? notes : [],
        expenses: ["admin", "ceo"].includes(req.role) ? expenses : [],
        forecasts: visible ? forecasts : [],
      });
    }),
  );
  r.post(
    "/alerts/:id/acknowledge",
    safe(async (req, res) => {
      warehouse(req);
      const ref = db.collection("hhAlerts").doc(text(req.params.id, 150));
      const d = await ref.get();
      if (!d.exists) throw new Fault("Alert not found.", 404);
      await ref.update({
        acknowledgedBy: req.identity.uid,
        acknowledgedAt: stamp(),
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/orders/:id/destination",
    safe(async (req, res) => {
      warehouse(req);
      const destination = coordinates(req.body);
      const ref = db.collection("hhOrders").doc(req.params.id),
        d = await ref.get();
      if (!d.exists) throw new Fault("Order not found.", 404);
      if (["Delivered", "Cancelled"].includes(d.data().status))
        throw new Fault("Completed order destination is locked.", 409);
      await ref.update({ destination });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/orders/:id/locations",
    safe(async (req, res) => {
      if (req.role !== "driver")
        throw new Fault("Driver access required.", 403);
      const events = req.body.events;
      if (!Array.isArray(events) || !events.length || events.length > 100)
        throw new Fault("Send between 1 and 100 locations.");
      const parsed = events.map((e) => {
        const p = coordinates(e),
          id = text(e.eventId, 100),
          at = Date.parse(e.capturedAt);
        if (
          !/^[\w-]+$/.test(id) ||
          !Number.isFinite(at) ||
          at > Date.now() + 300000 ||
          at < Date.now() - 7 * 86400000
        )
          throw new Fault("Invalid tracking event time or ID.");
        return {
          ...p,
          eventId: id,
          capturedAt: new Date(at).toISOString(),
          accuracyMetres: Math.max(0, Number(e.accuracyMetres) || 0),
          driverUid: req.identity.uid,
          orderId: req.params.id,
        };
      });
      const ref = db.collection("hhOrders").doc(req.params.id);
      const doc = await ref.get();
      if (!doc.exists) throw new Fault("Order not found.", 404);
      allowed(req, doc.data());
      const latest = parsed.reduce((a, b) =>
        a.capturedAt > b.capturedAt ? a : b,
      );
      let eta = null,
        etaMethod = null;
      if (doc.data().destination) {
        const matrix = await routeMatrix([latest, doc.data().destination]);
        eta = new Date(
          Date.parse(latest.capturedAt) + matrix.durations[0][1] * 1000,
        ).toISOString();
        etaMethod = matrix.method;
      }
      await db.runTransaction(async (t) => {
        const d = await t.get(ref),
          o = d.data();
        allowed(req, o);
        const dispatched = o.events.find(
            (e) => e.status === "Left warehouse",
          )?.at,
          delivered = o.events.find((e) => e.status === "Delivered")?.at;
        if (
          !dispatched ||
          parsed.some(
            (e) =>
              e.capturedAt < dispatched ||
              (delivered && e.capturedAt > delivered),
          )
        )
          throw new Fault(
            "Location event is outside the delivery interval.",
            409,
          );
        if (new Set(parsed.map((e) => e.eventId)).size !== parsed.length)
          throw new Fault("Duplicate tracking event IDs in the batch.", 409);
        const refs = parsed.map((e) =>
          db.collection("hhLocations").doc(
            crypto
              .createHash("sha256")
              .update(req.params.id + ":" + e.eventId)
              .digest("hex"),
          ),
        );
        const existing = await Promise.all(refs.map((x) => t.get(x)));
        parsed.forEach((e, i) => {
          if (
            existing[i].exists &&
            [
              "latitude",
              "longitude",
              "capturedAt",
              "driverUid",
              "orderId",
              "accuracyMetres",
            ].some((k) => existing[i].data()[k] !== e[k])
          )
            throw new Fault(
              "Tracking event ID was already used for another location.",
              409,
            );
          if (!existing[i].exists) t.set(refs[i], e);
        });
        if (
          o.status !== "Delivered" &&
          (!o.location ||
            latest.capturedAt >= (o.location.capturedAt || o.location.at))
        ) {
          t.update(ref, {
            location: { ...latest, at: latest.capturedAt },
            eta,
            etaMethod,
            trackingStatus:
              o.destination && metres(latest, o.destination) <= 100
                ? "Nearby"
                : "En Route",
          });
        }
      });
      await refreshOperationalAlerts(db);
      res.status(202).json({ ok: true });
    }),
  );
  r.get(
    "/orders/:id/route-history",
    safe(async (req, res) => {
      const d = await db.collection("hhOrders").doc(req.params.id).get();
      if (!d.exists) throw new Fault("Order not found.", 404);
      allowed(req, d.data());
      const s = await db
        .collection("hhLocations")
        .where("orderId", "==", req.params.id)
        .get();
      const events = s.docs
        .map((d) => d.data())
        .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
      let distanceMetres = 0;
      events.forEach((e, i) => {
        if (i) distanceMetres += metres(events[i - 1], e);
      });
      res.json({
        events,
        distanceMetres: Math.round(distanceMetres),
        durationSeconds:
          events.length > 1
            ? Math.round(
                (Date.parse(events.at(-1).capturedAt) -
                  Date.parse(events[0].capturedAt)) /
                  1000,
              )
            : 0,
      });
    }),
  );
  r.post(
    "/routes/plan",
    safe(async (req, res) => {
      if (!["driver", "warehouse", "admin", "ceo"].includes(req.role))
        throw new Fault("Delivery staff access required.", 403);
      const driverUid =
        req.role === "driver"
          ? req.identity.uid
          : text(req.body.driverUid, 150);
      const origin = coordinates(req.body.origin);
      const s = await db
        .collection("hhOrders")
        .where("driverUid", "==", driverUid)
        .get();
      const orders = s.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => !["Delivered", "Cancelled"].includes(o.status));
      if (!orders.length) throw new Fault("No active assigned stops.", 409);
      if (orders.length > 50)
        throw new Fault("Split routes exceeding 50 stops.");
      if (orders.some((o) => !o.destination))
        throw new Fault(
          "Warehouse must record coordinates for every destination.",
          409,
        );
      const matrix = await routeMatrix([
        origin,
        ...orders.map((o) => o.destination),
      ]);
      const sequence = sortStops(
        orders.map((o) => ({
          orderId: o.id,
          address: o.address,
          destination: o.destination,
          windowStart: o.windowStart,
          windowEnd: o.windowEnd,
        })),
        matrix,
      );
      const ref = db.collection("hhRoutes").doc(driverUid);
      await ref.set({
        driverUid,
        origin,
        sequence,
        method: matrix.method,
        createdAt: stamp(),
      });
      res.json({ sequence, method: matrix.method });
    }),
  );
  r.get(
    "/routes/current",
    safe(async (req, res) => {
      if (!["driver", "warehouse", "admin", "ceo"].includes(req.role))
        throw new Fault("Delivery staff access required.", 403);
      const uid =
          req.role === "driver"
            ? req.identity.uid
            : String(req.query.driverUid || req.identity.uid),
        d = await db.collection("hhRoutes").doc(uid).get();
      res.json({ route: d.exists ? d.data() : null });
    }),
  );
  r.post(
    "/intakes",
    safe(async (req, res) => {
      warehouse(req);
      const productId = text(req.body.productId, 100);
      if (!catalog.some((p) => p.id === productId))
        throw new Fault("Unknown fruit.");
      const receivedGrams = gram(req.body.receivedKg),
        rejectedGrams = integer(
          Math.round(Number(req.body.rejectedKg || 0) * 1000),
        );
      if (rejectedGrams > receivedGrams)
        throw new Fault("Rejected weight exceeds received weight.");
      const acceptedGrams = receivedGrams - rejectedGrams;
      const lot = text(req.body.lot, 100),
        supplier = text(req.body.supplier, 200);
      const id = crypto
        .createHash("sha256")
        .update(productId + ":" + lot)
        .digest("hex");
      await db.runTransaction(async (t) => {
        const ref = db.collection("hhIntakes").doc(id),
          rr = db.collection("hhRawInventory").doc(productId),
          prior = await t.get(ref),
          raw = await t.get(rr);
        if (prior.exists)
          throw new Fault("That supplier lot has already been received.", 409);
        t.set(ref, {
          productId,
          lot,
          supplier,
          receivedGrams,
          rejectedGrams,
          acceptedGrams,
          at: stamp(),
          by: req.identity.uid,
        });
        t.set(rr, {
          productId,
          grams: (raw.data()?.grams || 0) + acceptedGrams,
        });
      });
      res.status(201).json({ id });
    }),
  );
  r.post(
    "/batches",
    safe(async (req, res) => {
      warehouse(req);
      const intakeId = text(req.body.intakeId, 100),
        inputGrams = gram(req.body.inputKg);
      const ref = db.collection("hhBatches").doc();
      await db.runTransaction(async (t) => {
        const ir = db.collection("hhIntakes").doc(intakeId),
          d = await t.get(ir);
        if (!d.exists) throw new Fault("Intake lot not found.", 404);
        const intake = d.data(),
          rr = db.collection("hhRawInventory").doc(intake.productId),
          raw = await t.get(rr),
          bs = await t.get(
            db.collection("hhBatches").where("intakeId", "==", intakeId),
          );
        const consumed = bs.docs.reduce((n, d) => n + d.data().inputGrams, 0);
        if (
          inputGrams > intake.acceptedGrams - consumed ||
          inputGrams > (raw.data()?.grams || 0)
        )
          throw new Fault(
            "Insufficient unprocessed fresh fruit in this lot.",
            409,
          );
        t.update(rr, { grams: raw.data().grams - inputGrams });
        t.set(ref, {
          intakeId,
          lot: intake.lot,
          supplier: intake.supplier,
          productId: intake.productId,
          inputGrams,
          steps: [],
          status: "Processing",
          createdAt: stamp(),
          operator: req.identity.uid,
        });
      });
      res.status(201).json({ id: ref.id });
    }),
  );
  const steps = [
    "Wash",
    "Select",
    "Peel",
    "Slice",
    "Tray",
    "Dry",
    "Cool",
    "Quality release",
    "Pack",
  ];
  r.post(
    "/batches/:id/advance",
    safe(async (req, res) => {
      warehouse(req);
      await db.runTransaction(async (t) => {
        const ref = db.collection("hhBatches").doc(req.params.id),
          d = await t.get(ref);
        if (!d.exists) throw new Fault("Batch not found.", 404);
        const b = d.data();
        if (b.status === "Released")
          throw new Fault("Batch is already released.", 409);
        const step = steps[b.steps.length];
        if (!step) throw new Fault("All batch steps already recorded.", 409);
        const finishedBoxes =
          step === "Pack" ? integer(req.body.finishedBoxes, 1) : null;
        const wasteGrams =
          step === "Pack"
            ? integer(Math.round(Number(req.body.wasteKg || 0) * 1000))
            : null;
        const outputGrams = step === "Pack" ? finishedBoxes * 24 * 100 : null;
        if (step === "Pack" && outputGrams + wasteGrams > b.inputGrams)
          throw new Fault("Finished output and waste exceed input weight.");
        const sr = db.collection("hhInventory").doc(b.productId),
          stock = step === "Pack" ? await t.get(sr) : null;
        t.update(ref, {
          steps: [...b.steps, { step, at: stamp(), by: req.identity.uid }],
          ...(step === "Pack"
            ? {
                status: "Released",
                finishedBoxes,
                outputGrams,
                wasteGrams,
                releasedAt: stamp(),
              }
            : {}),
        });
        if (step === "Pack")
          t.set(sr, {
            reservedBoxes: 0,
            priceCents: 0,
            threshold: 0,
            ...stock.data(),
            onHandBoxes: (stock.data()?.onHandBoxes || 0) + finishedBoxes,
          });
      });
      await refreshOperationalAlerts(db);
      res.json({ ok: true });
    }),
  );
  r.post(
    "/attendance/config",
    safe(async (req, res) => {
      own(req);
      const centre = coordinates(req.body),
        radiusMetres = integer(req.body.radiusMetres, 1);
      if (radiusMetres > 100)
        throw new Fault("Attendance radius must be 100 metres or less.");
      const ips = String(req.body.allowedIPs || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!ips.length)
        throw new Fault("At least one premises public IP is required.");
      const timezone = text(req.body.timezone, 100);
      try {
        new Intl.DateTimeFormat("en", { timeZone: timezone });
      } catch {
        throw new Fault("Invalid timezone.");
      }
      await db
        .collection("hhSettings")
        .doc("attendance")
        .set({ ...centre, radiusMetres, allowedIPs: ips, timezone });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/attendance/shift",
    safe(async (req, res) => {
      own(req);
      const uid = text(req.body.uid, 150),
        day = text(req.body.day, 10),
        start = Date.parse(req.body.start),
        end = Date.parse(req.body.end);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        !Number.isFinite(start) ||
        end <= start
      )
        throw new Fault("A valid shift is required.");
      await db
        .collection("hhShifts")
        .doc(uid + "-" + day)
        .set({
          uid,
          day,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/attendance/punch",
    safe(async (req, res) => {
      if (req.role === "customer")
        throw new Fault("Staff account required.", 403);
      const cfg = await db.collection("hhSettings").doc("attendance").get();
      if (!cfg.exists)
        throw new Fault("Premises attendance configuration is required.", 503);
      const c = cfg.data(),
        p = coordinates(req.body),
        accuracy = Number(req.body.accuracyMetres);
      if (
        !Number.isFinite(accuracy) ||
        accuracy > 50 ||
        accuracy < 0 ||
        metres(c, p) > c.radiusMetres
      )
        throw new Fault(
          "A precise location inside the premises is required.",
          403,
        );
      const ip = String(req.ip || "").replace(/^::ffff:/, "");
      if (!c.allowedIPs.includes(ip))
        throw new Fault("Connect to the authorised premises network.", 403);
      const device = text(req.body.deviceId, 100),
        action = req.body.action;
      if (!["in", "out"].includes(action))
        throw new Fault("Invalid attendance action.");
      const photo = String(req.body.photo || "").match(
        /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/,
      );
      if (!photo) throw new Fault("A camera snapshot is mandatory.");
      const bytes = Buffer.from(photo[2], "base64");
      if (bytes.length < 30 || bytes.length > 5 * 1024 * 1024)
        throw new Fault("Snapshot size is invalid.");
      const bucket = process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET;
      if (!bucket) throw new Fault("Photo storage is not configured.", 503);
      const at = stamp(),
        day = new Intl.DateTimeFormat("en-CA", {
          timeZone: c.timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
      const id = crypto.randomUUID(),
        path = `attendance/${req.identity.uid}/${id}.${photo[1]}`;
      await storage()
        .bucket(bucket)
        .file(path)
        .save(bytes, { resumable: false, contentType: "image/" + photo[1] });
      await db.runTransaction(async (t) => {
        const rr = db.collection("hhAttendanceSessions").doc(req.identity.uid),
          session = await t.get(rr),
          sr = db.collection("hhShifts").doc(req.identity.uid + "-" + day),
          shift = await t.get(sr);
        if (action === "in" && session.data()?.active)
          throw new Fault("You are already signed in.", 409);
        if (action === "out" && !session.data()?.active)
          throw new Fault("Sign in before signing out.", 409);
        const status = shift.exists
          ? action === "in"
            ? Date.parse(at) > Date.parse(shift.data().start)
              ? "Late"
              : "On time"
            : Date.parse(at) < Date.parse(shift.data().end)
              ? "Left early"
              : "Completed"
          : "Unscheduled";
        t.set(db.collection("hhAttendance").doc(id), {
          uid: req.identity.uid,
          day,
          action,
          at,
          status,
          ip,
          deviceId: device,
          ...p,
          accuracyMetres: accuracy,
          photoPath: path,
          hours:
            action === "out"
              ? (Date.parse(at) - Date.parse(session.data().signedInAt)) /
                3600000
              : null,
        });
        t.set(rr, {
          uid: req.identity.uid,
          active: action === "in",
          signedInAt: action === "in" ? at : session.data().signedInAt,
          lastAt: at,
        });
      });
      res.json({ ok: true, at });
    }),
  );
  r.get(
    "/attendance/:id/photo",
    safe(async (req, res) => {
      const d = await db.collection("hhAttendance").doc(req.params.id).get();
      if (!d.exists) throw new Fault("Attendance not found.", 404);
      if (
        d.data().uid !== req.identity.uid &&
        !["warehouse", "admin", "ceo"].includes(req.role)
      )
        throw new Fault("Attendance access denied.", 403);
      const [bytes] = await storage()
        .bucket(process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET)
        .file(d.data().photoPath)
        .download();
      res.type("image/" + d.data().photoPath.split(".").pop()).send(bytes);
    }),
  );
  r.post(
    "/visits",
    safe(async (req, res) => {
      sales(req);
      const prospectId = text(req.body.prospectId, 100),
        d = await db.collection("hhProspects").doc(prospectId).get();
      if (!d.exists) throw new Fault("Prospect not found.", 404);
      const outcome = text(req.body.outcome, 100);
      if (!["Follow-up", "Trial", "Signed", "Rejected"].includes(outcome))
        throw new Fault("Choose a valid visit outcome.");
      if (outcome === "Rejected" && !String(req.body.notes || "").trim())
        throw new Fault("Record the reason for rejection.");
      const ref = db.collection("hhVisits").doc();
      await ref.set({
        prospectId,
        outcome,
        notes: String(req.body.notes || "").slice(0, 2000),
        followUpAt: req.body.followUpAt || null,
        ...coordinates(req.body),
        at: stamp(),
        by: req.identity.uid,
      });
      res.status(201).json({ id: ref.id });
    }),
  );
  r.post(
    "/prospects/:id/activate",
    safe(async (req, res) => {
      sales(req);
      const ref = db.collection("hhProspects").doc(req.params.id),
        d = await ref.get();
      if (!d.exists) throw new Fault("Prospect not found.", 404);
      const uid = text(req.body.customerUid, 150),
        user = await auth.getUser(uid);
      if (user.customClaims?.hhRole && user.customClaims.hhRole !== "customer")
        throw new Fault("Select a customer identity.");
      const a = await db.collection("hhAccounts").doc(uid).get();
      if (!a.exists)
        throw new Fault(
          "Customer must register and save account details first.",
          409,
        );
      await ref.update({
        stage: "Active customer",
        customerUid: uid,
        activatedAt: stamp(),
        activatedBy: req.identity.uid,
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/trials",
    safe(async (req, res) => {
      sales(req);
      const productId = text(req.body.productId, 100),
        boxes = integer(req.body.boxes, 1),
        prospectId = text(req.body.prospectId, 100),
        reviewAt = text(req.body.reviewAt, 40),
        pr = await db.collection("hhProspects").doc(prospectId).get();
      if (!pr.exists) throw new Fault("Prospect not found.", 404);
      const ref = db.collection("hhTrials").doc();
      await db.runTransaction(async (t) => {
        const sr = db.collection("hhInventory").doc(productId),
          d = await t.get(sr);
        if (!d.exists || boxes > d.data().onHandBoxes - d.data().reservedBoxes)
          throw new Fault("Insufficient stock for the trial.", 409);
        t.update(sr, { onHandBoxes: d.data().onHandBoxes - boxes });
        t.set(ref, {
          prospectId,
          productId,
          boxes,
          reviewAt,
          equipmentId: req.body.equipmentId || null,
          status: "Issued",
          issuedAt: stamp(),
          by: req.identity.uid,
        });
      });
      await refreshOperationalAlerts(db);
      res.status(201).json({ id: ref.id });
    }),
  );
  r.post(
    "/trials/:id/reconcile",
    safe(async (req, res) => {
      sales(req);
      const soldBoxes = integer(req.body.soldBoxes),
        returnedBoxes = integer(req.body.returnedBoxes),
        wasteBoxes = integer(req.body.wasteBoxes),
        ref = db.collection("hhTrials").doc(req.params.id);
      await db.runTransaction(async (t) => {
        const d = await t.get(ref);
        if (!d.exists) throw new Fault("Trial not found.", 404);
        const x = d.data();
        if (x.status !== "Issued")
          throw new Fault("Trial is already reconciled.", 409);
        if (soldBoxes + returnedBoxes + wasteBoxes !== x.boxes)
          throw new Fault(
            "Sold, returned and waste quantities must match issued stock.",
          );
        const sr = db.collection("hhInventory").doc(x.productId),
          s = await t.get(sr);
        t.update(ref, {
          status: "Reconciled",
          soldBoxes,
          returnedBoxes,
          wasteBoxes,
          at: stamp(),
          reconciledBy: req.identity.uid,
        });
        t.update(sr, { onHandBoxes: s.data().onHandBoxes + returnedBoxes });
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/executive-notes",
    safe(async (req, res) => {
      own(req);
      const kind = text(req.body.kind, 50);
      if (
        ![
          "Priority",
          "Decision",
          "Meeting",
          "Strategy",
          "Compliance",
          "Event",
          "Season",
          "Reference",
          "Proposal",
          "Market research",
        ].includes(kind)
      )
        throw new Fault("Invalid record kind.");
      const ref = req.body.id
        ? db.collection("hhExecutiveNotes").doc(text(req.body.id, 100))
        : db.collection("hhExecutiveNotes").doc();
      await ref.set({
        kind,
        title: text(req.body.title, 200),
        body: text(req.body.body, 10000),
        dueAt: req.body.dueAt || null,
        status: text(req.body.status || "Open", 50),
        source: String(req.body.source || "").slice(0, 500),
        updatedAt: stamp(),
        by: req.identity.uid,
      });
      res.json({ id: ref.id });
    }),
  );
  r.post(
    "/accounts/:uid/pricing",
    safe(async (req, res) => {
      own(req);
      const ref = db.collection("hhAccounts").doc(req.params.uid),
        d = await ref.get();
      if (!d.exists) throw new Fault("Customer account not found.", 404);
      const productPrices = req.body.productPrices;
      if (!productPrices || typeof productPrices !== "object")
        throw new Fault("Enter contract prices.");
      for (const [id, cents] of Object.entries(productPrices)) {
        if (!catalog.some((p) => p.id === id))
          throw new Fault("Unknown product.");
        integer(cents, 1);
      }
      await ref.update({
        productPrices,
        pricingApprovedBy: req.identity.uid,
        pricingApprovedAt: stamp(),
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/equipment/:id/return",
    safe(async (req, res) => {
      warehouse(req);
      const ref = db.collection("hhEquipment").doc(req.params.id);
      await db.runTransaction(async (t) => {
        const d = await t.get(ref);
        if (!d.exists) throw new Fault("Equipment not found.", 404);
        const item = d.data();
        t.update(ref, {
          holderUid: null,
          history: [
            ...(item.history || []),
            {
              holderUid: item.holderUid,
              action: "Returned",
              at: stamp(),
              by: req.identity.uid,
            },
          ],
          updatedAt: stamp(),
        });
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/expenses",
    safe(async (req, res) => {
      own(req);
      const ref = db.collection("hhExpenses").doc();
      await ref.set({
        amountCents: integer(req.body.amountCents, 1),
        category: text(req.body.category, 100),
        reference: text(req.body.reference, 150),
        at: stamp(),
        by: req.identity.uid,
      });
      res.json({ id: ref.id });
    }),
  );
  r.post(
    "/forecasts",
    safe(async (req, res) => {
      warehouse(req);
      const ref = db.collection("hhForecasts").doc();
      await ref.set({
        productId: text(req.body.productId, 100),
        expectedKg: gram(req.body.expectedKg) / 1000,
        expectedAt: text(req.body.expectedAt, 40),
        supplier: text(req.body.supplier, 200),
        note: String(req.body.note || "").slice(0, 2000),
        by: req.identity.uid,
        at: stamp(),
      });
      res.json({ id: ref.id });
    }),
  );
  r.post(
    "/orders/:id/cancel",
    safe(async (req, res) => {
      const ref = db.collection("hhOrders").doc(req.params.id);
      await db.runTransaction(async (t) => {
        const d = await t.get(ref);
        if (!d.exists) throw new Fault("Order not found.", 404);
        const o = d.data();
        allowed(req, o);
        if (!["customer", "warehouse", "admin", "ceo"].includes(req.role))
          throw new Fault("Cancellation access denied.", 403);
        if (o.status === "Cancelled") return;
        if (
          !["Confirmed", "Preparing", "Ready for collection"].includes(o.status)
        )
          throw new Fault("Dispatched orders cannot be cancelled here.", 409);
        const stocks = await Promise.all(
          o.lines.map((l) =>
            t.get(db.collection("hhInventory").doc(l.productId)),
          ),
        );
        const ar = db.collection("hhAccounts").doc(o.customerUid),
          a = await t.get(ar);
        o.lines.forEach((l, i) => {
          if (stocks[i].data().reservedBoxes < l.boxes)
            throw new Fault("Reservation mismatch.", 409);
          t.update(db.collection("hhInventory").doc(l.productId), {
            reservedBoxes: stocks[i].data().reservedBoxes - l.boxes,
          });
        });
        t.update(ar, { balanceCents: a.data().balanceCents - o.totalCents });
        t.update(ref, {
          status: "Cancelled",
          cancelledAt: stamp(),
          paidCents: 0,
          totalCents: 0,
          originalTotalCents: o.totalCents,
          cancelledPaymentCents: o.paidCents,
          events: [
            ...o.events,
            { status: "Cancelled", at: stamp(), by: req.identity.uid },
          ],
          notifications: [
            ...(o.notifications || []),
            {
              at: stamp(),
              message:
                "YOUR ORDER HAS BEEN CANCELLED — ANY PAYMENT REMAINS AS ACCOUNT CREDIT",
            },
          ],
        });
      });
      res.json({ ok: true });
    }),
  );
  r.post(
    "/orders/:id/issue",
    safe(async (req, res) => {
      if (req.role !== "driver")
        throw new Fault("Driver access required.", 403);
      const ref = db.collection("hhOrders").doc(req.params.id),
        d = await ref.get();
      if (!d.exists) throw new Fault("Order not found.", 404);
      allowed(req, d.data());
      await ref.update({
        deliveryIssue: text(req.body.reason, 1000),
        issueAt: stamp(),
      });
      await db
        .collection("hhAlerts")
        .doc("issue-" + req.params.id)
        .set({
          type: "Delivery issue",
          orderId: req.params.id,
          roles: ["warehouse", "admin", "ceo"],
          active: true,
          message: text(req.body.reason, 1000),
          firstSeen: stamp(),
        });
      res.json({ ok: true });
    }),
  );
  r.get(
    "/exports/:kind",
    safe(async (req, res) => {
      const kinds = {
        orders: "hhOrders",
        payments: "hhPayments",
        equipment: "hhEquipment",
        attendance: "hhAttendance",
        visits: "hhVisits",
        intakes: "hhIntakes",
        batches: "hhBatches",
        expenses: "hhExpenses",
      };
      const col = kinds[req.params.kind];
      if (!col) throw new Fault("Unknown export.", 404);
      if (["customer", "driver", "staff"].includes(req.role))
        throw new Fault("Staff access required.", 403);
      if (["payments", "expenses"].includes(req.params.kind)) own(req);
      if (["intakes", "batches", "attendance"].includes(req.params.kind))
        warehouse(req);
      if (req.params.kind === "visits") sales(req);
      const data = await rows(db, col);
      const fields = [...new Set(data.flatMap((x) => Object.keys(x)))].filter(
        (k) => !["photoPath", "proofPath", "requestFingerprint"].includes(k),
      );
      const cell = (v) =>
        '"' +
        String(typeof v === "object" ? JSON.stringify(v) : (v ?? ""))
          .replace(/^[=+@-]/, "'$&")
          .replace(/"/g, '""') +
        '"';
      const csv = [
        fields.map(cell).join(","),
        ...data.map((x) => fields.map((k) => cell(x[k])).join(",")),
      ].join("\r\n");
      res
        .set(
          "Content-Disposition",
          `attachment; filename="horn-harvest-${req.params.kind}.csv"`,
        )
        .type("text/csv")
        .send(csv);
    }),
  );
}
