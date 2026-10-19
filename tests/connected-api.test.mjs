import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { operationsApi } from "../backend/runtime/api.mjs";
import { db, auth, storage } from "./support/api-test-kit.mjs";
const app = express();
app.use("/api/operations", operationsApi({ db, auth, storage }));
const server = app.listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/api/operations`;
async function call(path, who, body, key = "unique-" + crypto.randomUUID()) {
  const r = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + who,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
let orderId;
test("authentication fails closed and accounts start without fabricated money", async () => {
  assert.equal((await call("/workspace", "invalid")).status, 401);
  assert.equal(
    (
      await call("/account", "buyer", {
        contactName: "Buyer",
        company: "Shop",
        address: "Mogadishu",
        phone: "252610000000",
      })
    ).status,
    200,
  );
  await call("/account", "other", {
    contactName: "Other",
    company: "Other shop",
    address: "Mogadishu",
    phone: "252610000001",
  });
  const w = await call("/workspace", "buyer");
  assert.equal(w.data.account.balanceCents, 0);
  assert.equal(w.data.orders.length, 0);
});
test("staff configure real stock; repeated order request reserves and charges once", async () => {
  assert.equal(
    (
      await call("/inventory/mango", "buyer", {
        onHandBoxes: 10,
        priceCents: 3816,
        threshold: 2,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("/inventory/mango", "warehouse", {
        onHandBoxes: 10,
        priceCents: 3816,
        threshold: 2,
      })
    ).status,
    200,
  );
  const input = {
    items: [{ productId: "mango", boxes: 2 }],
    address: "Mogadishu",
  };
  const a = await call("/orders", "buyer", input, "same-request");
  assert.equal(a.status, 201);
  orderId = a.data.order.id;
  const b = await call("/orders", "buyer", input, "same-request");
  assert.equal(b.data.order.id, orderId);
  const w = (await call("/workspace", "buyer")).data;
  assert.equal(w.orders.length, 1);
  assert.equal(w.account.balanceCents, 7632);
  assert.equal(w.inventory[0].reservedBoxes, 2);
  assert.equal(
    (
      await call("/orders", "buyer", {
        items: [{ productId: "mango", boxes: 9 }],
        address: "Mogadishu",
      })
    ).status,
    409,
  );
});
test("receipt idempotency, access isolation and complete warehouse/driver flow", async () => {
  const deliveryWindowStart = new Date(Date.now() + 60 * 60 * 1000);
  const deliveryWindowEnd = new Date(Date.now() + 3 * 60 * 60 * 1000);
  assert.equal((await call(`/orders/${orderId}`, "other")).status, 403);
  assert.equal(
    (
      await call(`/orders/${orderId}/status`, "warehouse", {
        status: "Preparing",
      })
    ).status,
    409,
  );
  const payment = {
    customerUid: "buyer",
    orderId,
    amountCents: 7632,
    reference: "BANK-100",
  };
  assert.equal((await call("/payments", "buyer", payment)).status, 403);
  assert.equal((await call("/payments", "admin", payment)).status, 200);
  assert.equal((await call("/payments", "admin", payment)).status, 200);
  assert.equal(
    (await call("/workspace", "buyer")).data.account.balanceCents,
    0,
  );
  assert.equal(
    (
      await call(`/orders/${orderId}/status`, "warehouse", {
        status: "Preparing",
      })
    ).status,
    200,
  );
  await call(`/orders/${orderId}/status`, "warehouse", {
    status: "Ready for collection",
  });
  assert.equal(
    (
      await call(`/orders/${orderId}/assign`, "warehouse", {
        driverUid: "driver",
        windowStart: deliveryWindowStart.toISOString(),
        windowEnd: deliveryWindowEnd.toISOString(),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(`/orders/${orderId}/status`, "driver", {
        status: "Left warehouse",
      })
    ).status,
    200,
  );
  let w = (await call("/workspace", "warehouse")).data;
  assert.equal(w.inventory[0].onHandBoxes, 8);
  assert.equal(w.inventory[0].reservedBoxes, 0);
  assert.equal(
    (
      await call(`/orders/${orderId}/status`, "driver", {
        status: "Left warehouse",
      })
    ).status,
    409,
  );
  await call(`/orders/${orderId}/status`, "driver", { status: "Arrived" });
  assert.equal(
    (await call(`/orders/${orderId}/status`, "driver", { status: "Delivered" }))
      .status,
    400,
  );
  process.env.PROOF_OF_DELIVERY_STORAGE_BUCKET = "test";
  const photo =
    "data:image/jpeg;base64," + Buffer.alloc(100, 1).toString("base64");
  assert.equal(
    (
      await call(`/orders/${orderId}/status`, "driver", {
        status: "Delivered",
        recipient: "Receiver Name",
        photo,
      })
    ).status,
    200,
  );
  w = (await call("/workspace", "buyer")).data;
  assert.equal(w.orders[0].status, "Delivered");
  assert.equal(w.orders[0].notifications.length, 2);
  assert.ok(w.orders[0].invoiceNumber);
  assert.equal((await call("/workspace", "driver")).data.payments.length, 0);
});
test("account deposits, equipment ownership and customer isolation", async () => {
  await call("/payments", "admin", {
    customerUid: "buyer",
    amountCents: 2000,
    reference: "DEPOSIT-1",
  });
  assert.equal(
    (await call("/workspace", "buyer")).data.account.balanceCents,
    -2000,
  );
  assert.equal(
    (
      await call("/equipment", "warehouse", {
        name: "Display tray",
        quantity: 1,
        holderUid: "buyer",
        ownership: "Horn & Harvest loan",
      })
    ).status,
    200,
  );
  assert.equal((await call("/workspace", "buyer")).data.equipment.length, 1);
  assert.equal((await call("/workspace", "other")).data.equipment.length, 0);
});
test.after(() => server.close());
