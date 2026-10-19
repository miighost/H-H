import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  LocalStore,
  localFileStorage,
} from "../backend/runtime/local-store.mjs";
import { publicRequests } from "../backend/runtime/public-requests.mjs";
import { operationsApi } from "../backend/runtime/api.mjs";
import { auth, identities } from "./support/api-test-kit.mjs";
import {
  refreshOperationalAlerts,
  refreshAbsences,
  sortStops,
  routeMatrix,
} from "../backend/runtime/logistics.mjs";
import {
  paymentWebhooks,
  settleGateway,
  processPaymentEvents,
  verifyWebhook,
  cents,
} from "../backend/runtime/payments.mjs";
identities.sales = { uid: "sales", hhRole: "sales" };
process.env.CEO_AUTHORISED_EMAIL = "info@hornandharvest.com";
process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET = "local";
const photo =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg==";
async function fixture(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hh-api-")),
    db = new LocalStore(path.join(dir, "data.sqlite"));
  const app = express();
  app.use("/api", paymentWebhooks({ db }));
  app.use("/api/public", publicRequests({ db }));
  app.use(
    "/api/operations",
    operationsApi({
      db,
      auth,
      storage: localFileStorage(path.join(dir, "proof")),
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const request = async (role, p, b, headers = {}) => {
    const r = await fetch(base + "/api/operations" + p, {
      method: b === undefined ? "GET" : "POST",
      headers: {
        Authorization: "Bearer " + role,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
        ...headers,
      },
      body: b === undefined ? undefined : JSON.stringify(b),
    });
    return { status: r.status, data: await r.json() };
  };
  try {
    await fn({ db, request, base, dir });
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
}
const account = {
  contactName: "Buyer",
  company: "Buyer shop",
  address: "Mogadishu",
  phone: "252610000000",
};
test("real SQLite persists and rolls back transaction failures", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hh-db-")),
    file = path.join(dir, "hh.sqlite");
  let db = new LocalStore(file);
  await db.collection("x").doc("a").set({ v: 1 });
  await assert.rejects(
    db.runTransaction(async (t) => {
      t.update(db.collection("x").doc("a"), { v: 9 });
      throw Error("rollback");
    }),
  );
  assert.equal((await db.collection("x").doc("a").get()).data().v, 1);
  db.close();
  db = new LocalStore(file);
  assert.equal((await db.collection("x").doc("a").get()).data().v, 1);
  db.close();
  await fs.rm(dir, { recursive: true, force: true });
});
test("intake -> nine production steps -> finished stock release exactly once", () =>
  fixture(async ({ db, request }) => {
    const received = await request("warehouse", "/intakes", {
      productId: "mango",
      supplier: "Verified supplier",
      lot: "LOT1",
      receivedKg: 100,
      rejectedKg: 5,
    });
    assert.equal(received.status, 201);
    assert.equal(
      (
        await request("warehouse", "/intakes", {
          productId: "mango",
          supplier: "Verified supplier",
          lot: "LOT1",
          receivedKg: 100,
          rejectedKg: 5,
        })
      ).status,
      409,
    );
    const batch = await request("warehouse", "/batches", {
      intakeId: received.data.id,
      inputKg: 50,
    });
    assert.equal(batch.status, 201);
    for (let i = 0; i < 8; i++)
      assert.equal(
        (await request("warehouse", `/batches/${batch.data.id}/advance`, {}))
          .status,
        200,
      );
    assert.equal(
      (
        await request("warehouse", `/batches/${batch.data.id}/advance`, {
          finishedBoxes: 10,
          wasteKg: 2,
        })
      ).status,
      200,
    );
    assert.equal(
      (await db.collection("hhInventory").doc("mango").get()).data()
        .onHandBoxes,
      10,
    );
    assert.equal(
      (
        await request("warehouse", `/batches/${batch.data.id}/advance`, {
          finishedBoxes: 10,
          wasteKg: 2,
        })
      ).status,
      409,
    );
    assert.equal(
      (await db.collection("hhRawInventory").doc("mango").get()).data().grams,
      45000,
    );
    assert.equal((await request("buyer", "/intakes", {})).status, 403);
  }));
test("shared alerts, in-account delays, acknowledgement and recovery", () =>
  fixture(async ({ db, request }) => {
    await db
      .collection("hhInventory")
      .doc("mango")
      .set({ onHandBoxes: 3, reservedBoxes: 2, threshold: 2 });
    await db
      .collection("hhOrders")
      .doc("order")
      .set({
        customerUid: "buyer",
        status: "Left warehouse",
        windowEnd: new Date(Date.now() - 3600000).toISOString(),
        eta: new Date(Date.now() + 600000).toISOString(),
        notifications: [],
      });
    await refreshOperationalAlerts(db);
    const w = await request("warehouse", "/modules"),
      c = await request("ceo", "/modules"),
      b = await request("buyer", "/modules");
    assert.equal(w.data.alerts.length, 2);
    assert.equal(c.data.alerts.length, 2);
    assert.equal(b.data.alerts.length, 1);
    assert.equal(
      (await request("warehouse", "/alerts/stock-mango/acknowledge", {}))
        .status,
      200,
    );
    assert.equal(
      (await request("buyer", "/alerts/stock-mango/acknowledge", {})).status,
      403,
    );
    await refreshOperationalAlerts(db);
    assert.equal(
      (await db.collection("hhOrders").doc("order").get()).data().notifications
        .length,
      1,
    );
    await db.collection("hhInventory").doc("mango").update({ onHandBoxes: 20 });
    await refreshOperationalAlerts(db);
    assert.equal(
      (await db.collection("hhAlerts").doc("stock-mango").get()).data().active,
      false,
    );
  }));
test("tracking batches deduplicate, replay history persists, wrong driver rejected", () =>
  fixture(async ({ db, request }) => {
    const at = new Date(Date.now() - 1000).toISOString();
    await db
      .collection("hhOrders")
      .doc("order")
      .set({
        customerUid: "buyer",
        driverUid: "driver",
        status: "Left warehouse",
        events: [{ status: "Left warehouse", at }],
        destination: { latitude: 2.03, longitude: 45.3 },
        windowEnd: new Date(Date.now() + 3600000).toISOString(),
      });
    const events = [
      {
        eventId: "event1",
        latitude: 2.02,
        longitude: 45.29,
        capturedAt: new Date().toISOString(),
        accuracyMetres: 10,
      },
    ];
    assert.equal(
      (await request("driver", "/orders/order/locations", { events })).status,
      202,
    );
    assert.equal(
      (await request("driver", "/orders/order/locations", { events })).status,
      202,
    );
    const history = await request("buyer", "/orders/order/route-history");
    assert.equal(history.data.events.length, 1);
    assert.equal(
      (await request("other", "/orders/order/route-history")).status,
      403,
    );
    const o = (await db.collection("hhOrders").doc("order").get()).data();
    assert.ok(o.eta);
    assert.match(o.etaMethod, /estimate/);
    assert.equal(
      (
        await request("driver", "/routes/plan", {
          origin: { latitude: 2, longitude: 45 },
        })
      ).status,
      200,
    );
  }));
test("attendance geofence/network/photo checks, immutable in/out and absent records", () =>
  fixture(async ({ db, request }) => {
    assert.equal(
      (
        await request("admin", "/attendance/config", {
          latitude: 2,
          longitude: 45,
          radiusMetres: 100,
          allowedIPs: "127.0.0.1",
          timezone: "Africa/Mogadishu",
        })
      ).status,
      200,
    );
    const payload = {
      action: "in",
      latitude: 2,
      longitude: 45,
      accuracyMetres: 10,
      deviceId: "device",
      photo,
    };
    assert.equal(
      (
        await request("warehouse", "/attendance/punch", {
          ...payload,
          latitude: 3,
        })
      ).status,
      403,
    );
    assert.equal(
      (await request("warehouse", "/attendance/punch", payload)).status,
      200,
    );
    assert.equal(
      (await request("warehouse", "/attendance/punch", payload)).status,
      409,
    );
    assert.equal(
      (
        await request("warehouse", "/attendance/punch", {
          ...payload,
          action: "out",
        })
      ).status,
      200,
    );
    assert.equal(
      (await request("buyer", "/attendance/punch", payload)).status,
      403,
    );
    await db.collection("hhShifts").doc("driver-2026-10-01").set({
      uid: "driver",
      day: "2026-10-01",
      start: "2026-10-01T06:00:00Z",
      end: "2026-10-01T14:00:00Z",
    });
    await refreshAbsences(db);
    assert.equal(
      (
        await db
          .collection("hhAttendance")
          .doc("absent-driver-2026-10-01")
          .get()
      ).data().status,
      "Absent",
    );
  }));
test("field visit outcomes, trial issue/return and prospect activation persist", () =>
  fixture(async ({ db, request }) => {
    const p = await request("sales", "/prospects", {
      company: "Hotel",
      contactName: "Contact",
      phone: "252610000000",
      stage: "New",
      notes: "Initial contact",
    });
    const id = p.data.id;
    assert.equal(
      (
        await request("sales", "/visits", {
          prospectId: id,
          outcome: "Rejected",
          notes: "",
          latitude: 2,
          longitude: 45,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("sales", "/visits", {
          prospectId: id,
          outcome: "Trial",
          notes: "Agreed trial",
          latitude: 2,
          longitude: 45,
        })
      ).status,
      201,
    );
    await db
      .collection("hhInventory")
      .doc("mango")
      .set({ onHandBoxes: 10, reservedBoxes: 0, threshold: 1 });
    const t = await request("sales", "/trials", {
      productId: "mango",
      boxes: 3,
      prospectId: id,
      reviewAt: "2026-10-20",
    });
    assert.equal(t.status, 201);
    assert.equal(
      (
        await request("sales", `/trials/${t.data.id}/reconcile`, {
          soldBoxes: 1,
          returnedBoxes: 2,
          wasteBoxes: 0,
        })
      ).status,
      200,
    );
    assert.equal(
      (await db.collection("hhInventory").doc("mango").get()).data()
        .onHandBoxes,
      9,
    );
    await request("buyer", "/account", account);
    assert.equal(
      (
        await request("sales", `/prospects/${id}/activate`, {
          customerUid: "buyer",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("buyer", "/executive-notes", {
          kind: "Priority",
          title: "x",
          body: "x",
        })
      ).status,
      403,
    );
  }));
test("Waafi signature rejects tampering; settlement is idempotent and amount-bound", () =>
  fixture(async ({ db, request, base }) => {
    process.env.WAAFI_WEBHOOK_SECRET = "test-secret";
    process.env.WAAFI_MERCHANT_UID = "TEST-MERCHANT";
    await request("buyer", "/account", account);
    await db.collection("hhOrders").doc("order").set({
      id: "order",
      customerUid: "buyer",
      status: "Confirmed",
      totalCents: 1000,
      paidCents: 0,
    });
    await db
      .collection("hhAccounts")
      .doc("buyer")
      .update({ balanceCents: 1000 });
    await db.collection("hhPaymentSessions").doc("session").set({
      customerUid: "buyer",
      orderId: "order",
      amountCents: 1000,
      state: "Pending",
    });
    await assert.rejects(
      settleGateway(db, "session", {
        referenceId: "session",
        transactionId: "tx1",
        amountCents: 999,
        currency: "USD",
      }),
    );
    const payment = {
      referenceId: "session",
      transactionId: "tx1",
      amountCents: 1000,
      currency: "USD",
    };
    await settleGateway(db, "session", payment);
    await settleGateway(db, "session", payment);
    assert.equal(
      (await db.collection("hhAccounts").doc("buyer").get()).data()
        .balanceCents,
      0,
    );
    assert.equal(
      (await db.collection("hhOrders").doc("order").get()).data().paidCents,
      1000,
    );
    const raw = Buffer.from(
        JSON.stringify({
          event: "declined",
          merchant_uid: "TEST-MERCHANT",
          payment: { status: "DECLINED" },
        }),
      ),
      ts = String(Math.floor(Date.now() / 1000)),
      id = "event1",
      sig = crypto
        .createHmac("sha256", "test-secret")
        .update(`${ts}.${id}.`)
        .update(raw)
        .digest("hex");
    const headers = {
      "content-type": "application/json",
      "x-webhook-timestamp": ts,
      "x-webhook-event-id": id,
      "x-webhook-signature": sig,
    };
    assert.equal(verifyWebhook(raw, headers, "test-secret"), id);
    assert.throws(() =>
      verifyWebhook(Buffer.from("{}"), headers, "test-secret"),
    );
    assert.equal(
      (
        await fetch(base + "/api/waafi/webhook", {
          method: "POST",
          headers,
          body: raw,
        })
      ).status,
      200,
    );
    await processPaymentEvents(db);
    assert.equal(
      (await db.collection("hhPaymentEvents").doc(id).get()).data().state,
      "Processed",
    );
    assert.equal(cents("1.59"), 159);
  }));

test("public enquiries persist in sales queue and approved prices are explicit", () =>
  fixture(async ({ db, request, base }) => {
    assert.deepEqual(await (await fetch(base + "/api/public/prices")).json(), {
      approved: false,
    });
    assert.equal(
      (
        await request("admin", "/settings/retail-pricing", {
          pouchPriceCents: 159,
          deliveryCents: 200,
        })
      ).status,
      200,
    );
    assert.equal(
      (await (await fetch(base + "/api/public/prices")).json()).pouchPriceCents,
      159,
    );
    const r = await fetch(base + "/api/public/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "Retail enquiry",
        name: "Customer",
        phone: "252610000000",
        address: "Mogadishu",
        items: [{ productId: "mango", pouches: 2 }],
      }),
    });
    assert.equal(r.status, 201);
    const result = await r.json();
    assert.equal(
      (await db.collection("hhProspects").doc(result.requestId).get()).data()
        .stage,
      "New request",
    );
    assert.ok(
      (await request("sales", "/prospects")).data.prospects.some(
        (p) => p.id === result.requestId,
      ),
    );
  }));
test("server quantity and customer contract prices, cancellation release and deposits", () =>
  fixture(async ({ db, request }) => {
    await request("buyer", "/account", account);
    await request("admin", "/inventory/mango", {
      onHandBoxes: 100,
      priceCents: 3816,
      threshold: 2,
      tiers: [],
    });
    assert.equal(
      (
        await request("admin", "/inventory/mango/tiers", {
          tiers: [{ minimumBoxes: 10, priceCents: 2736 }],
        })
      ).status,
      200,
    );
    let r = await request("buyer", "/orders", {
      items: [{ productId: "mango", boxes: 10 }],
      address: "Mogadishu",
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.order.totalCents, 27360);
    assert.equal(
      (await request("buyer", `/orders/${r.data.order.id}/cancel`, {})).status,
      200,
    );
    assert.equal(
      (await db.collection("hhInventory").doc("mango").get()).data()
        .reservedBoxes,
      0,
    );
    assert.equal(
      (
        await request("admin", "/accounts/buyer/pricing", {
          productPrices: { mango: 2500 },
        })
      ).status,
      200,
    );
    r = await request("sales", "/orders", {
      customerUid: "buyer",
      items: [{ productId: "mango", boxes: 1 }],
      address: "Mogadishu",
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.order.totalCents, 2500);
    assert.equal(r.data.order.createdBy, "sales");
    assert.equal(
      (
        await request("buyer", "/accounts/buyer/pricing", {
          productPrices: { mango: 1 },
        })
      ).status,
      403,
    );
    await request("admin", "/payments", {
      customerUid: "buyer",
      orderId: r.data.order.id,
      amountCents: 2500,
      reference: "CANCEL-PAID",
    });
    assert.equal(
      (await request("buyer", `/orders/${r.data.order.id}/cancel`, {})).status,
      200,
    );
    assert.equal(
      (await db.collection("hhAccounts").doc("buyer").get()).data()
        .balanceCents,
      -2500,
    );
  }));
test("staff cannot access another role’s order or executive records", () =>
  fixture(async ({ db, request }) => {
    identities.staff = { uid: "staff", hhRole: "staff" };
    await db.collection("hhOrders").doc("private").set({
      customerUid: "buyer",
      driverUid: "driver",
      createdAt: new Date().toISOString(),
    });
    assert.equal((await request("staff", "/orders/private")).status, 403);
    assert.equal(
      (await request("staff", "/orders", { items: [] })).status,
      403,
    );
    assert.equal(
      (
        await request("staff", "/executive-notes", {
          kind: "Priority",
          title: "x",
          body: "x",
        })
      ).status,
      403,
    );
    assert.equal((await request("staff", "/workspace")).data.orders.length, 0);
  }));

test("equipment return, executive records, costs, forecasts and CSV exports are functional", () =>
  fixture(async ({ db, request, base }) => {
    const e = await request("admin", "/equipment", {
      name: "Display tray",
      quantity: 1,
      ownership: "Horn & Harvest",
      holderUid: "buyer",
    });
    assert.equal(e.status, 200);
    assert.equal(
      (await request("warehouse", `/equipment/${e.data.id}/return`, {})).status,
      200,
    );
    assert.equal(
      (await db.collection("hhEquipment").doc(e.data.id).get()).data()
        .holderUid,
      null,
    );
    const note = await request("ceo", "/executive-notes", {
      kind: "Decision",
      title: "Weekly priority",
      body: "Recorded decision",
      status: "Open",
    });
    assert.equal(note.status, 200);
    assert.equal(
      (
        await request("admin", "/executive-notes", {
          id: note.data.id,
          kind: "Decision",
          title: "Weekly priority",
          body: "Recorded decision",
          status: "Closed",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("ceo", "/expenses", {
          category: "Transport",
          amountCents: 1200,
          reference: "Receipt-001",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("warehouse", "/forecasts", {
          productId: "mango",
          expectedKg: 200,
          expectedAt: "2026-11-01",
          supplier: "Supplier",
        })
      ).status,
      200,
    );
    const csv = await fetch(base + "/api/operations/exports/expenses", {
      headers: { Authorization: "Bearer ceo" },
    });
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /Receipt-001/);
    assert.equal((await request("staff", "/routes/current")).status, 403);
  }));

test("checkout uses persisted order amount, deduplicates creation and reconciles refund once", () =>
  fixture(async ({ db, request, base }) => {
    const originalFetch = globalThis.fetch;
    let purchases = 0,
      reference;
    process.env.PAYMENTS_COMMISSIONED = "true";
    process.env.PUBLIC_BASE_URL = "https://hornandharvest.com";
    process.env.WAAFI_API_URL = "https://api.waafipay.com/asm";
    process.env.WAAFI_STORE_ID = "1";
    process.env.WAAFI_HPP_KEY = "test";
    process.env.WAAFI_MERCHANT_UID = "TEST-MERCHANT";
    process.env.WAAFI_WEBHOOK_SECRET = "test-secret";
    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith("https://api.waafipay.com")) {
        const b = JSON.parse(options.body);
        if (b.serviceName === "HPP_PURCHASE") {
          purchases++;
          reference = b.serviceParams.transactionInfo.referenceId;
          assert.equal(b.serviceParams.transactionInfo.amount, 10);
          return new Response(
            JSON.stringify({
              errorCode: "0",
              params: { directPaymentLink: "https://pay.waafipay.com/test" },
            }),
          );
        }
        return new Response(
          JSON.stringify({
            errorCode: "0",
            params: {
              status: "Approved",
              referenceId: reference,
              transactionId: "gateway-1",
              amount: "10.00",
              currency: "USD",
            },
          }),
        );
      }
      return originalFetch(url, options);
    };
    try {
      await request("buyer", "/account", account);
      await db.collection("hhOrders").doc("order").set({
        id: "order",
        customerUid: "buyer",
        status: "Confirmed",
        totalCents: 1000,
        paidCents: 0,
      });
      await db
        .collection("hhAccounts")
        .doc("buyer")
        .update({ balanceCents: 1000 });
      const headers = { "Idempotency-Key": "same-checkout" };
      assert.equal(
        (
          await request(
            "buyer",
            "/orders/order/checkout",
            { phone: "252610000000", amount: 1 },
            headers,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            "buyer",
            "/orders/order/checkout",
            { phone: "252610000000" },
            headers,
          )
        ).status,
        200,
      );
      assert.equal(purchases, 1);
      assert.equal(
        (
          await request(
            "buyer",
            "/orders/order/checkout",
            { phone: "252610000000" },
            { "Idempotency-Key": "other-key" },
          )
        ).status,
        409,
      );
      assert.equal(
        (await request("buyer", "/orders/order/reconcile-payment", {})).status,
        200,
      );
      assert.equal(
        (await db.collection("hhOrders").doc("order").get()).data().paidCents,
        1000,
      );
      const event = {
          event: "refund",
          merchant_uid: "TEST-MERCHANT",
          payment: {
            status: "APPROVED",
            original_transaction_id: "gateway-1",
            transaction_id: "refund-1",
            amount: "4.00",
            currency: "USD",
          },
        },
        raw = Buffer.from(JSON.stringify(event)),
        ts = String(Math.floor(Date.now() / 1000)),
        id = "refund-event",
        sig = crypto
          .createHmac("sha256", "test-secret")
          .update(`${ts}.${id}.`)
          .update(raw)
          .digest("hex");
      const r = await originalFetch(base + "/api/waafi/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-timestamp": ts,
          "x-webhook-event-id": id,
          "x-webhook-signature": sig,
        },
        body: raw,
      });
      assert.equal(r.status, 200);
      await processPaymentEvents(db);
      await processPaymentEvents(db);
      assert.equal(
        (await db.collection("hhAccounts").doc("buyer").get()).data()
          .balanceCents,
        400,
      );
      assert.equal(
        (await db.collection("hhOrders").doc("order").get()).data().paidCents,
        600,
      );
    } finally {
      globalThis.fetch = originalFetch;
      process.env.PAYMENTS_COMMISSIONED = "false";
    }
  }));

test("offline historical locations remain accepted after delivery; event IDs are immutable", () =>
  fixture(async ({ db, request }) => {
    const dispatch = new Date(Date.now() - 10000).toISOString(),
      delivered = new Date(Date.now() - 2000).toISOString();
    await db
      .collection("hhOrders")
      .doc("offline")
      .set({
        customerUid: "buyer",
        driverUid: "driver",
        status: "Delivered",
        events: [
          { status: "Left warehouse", at: dispatch },
          { status: "Delivered", at: delivered },
        ],
        location: { latitude: 2, longitude: 45, at: delivered },
      });
    const event = {
      eventId: "offline-point",
      latitude: 2.01,
      longitude: 45.01,
      capturedAt: new Date(Date.now() - 5000).toISOString(),
      accuracyMetres: 10,
    };
    assert.equal(
      (
        await request("driver", "/orders/offline/locations", {
          events: [event],
        })
      ).status,
      202,
    );
    assert.equal(
      (
        await request("driver", "/orders/offline/locations", {
          events: [{ ...event, latitude: 3 }],
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("driver", "/orders/offline/locations", {
          events: [
            { ...event, eventId: "late", capturedAt: new Date().toISOString() },
          ],
        })
      ).status,
      409,
    );
    assert.equal(
      (await db.collection("hhOrders").doc("offline").get()).data().location
        .latitude,
      2,
    );
    assert.equal(
      (await request("buyer", "/orders/offline/route-history")).data.events
        .length,
      1,
    );
  }));
