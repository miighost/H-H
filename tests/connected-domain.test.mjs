import test from "node:test";
import assert from "node:assert/strict";
import { createOrder, transition } from "../backend/runtime/domain.mjs";
const stock = {
  mango: { onHandBoxes: 10, reservedBoxes: 2, priceCents: 3816 },
};
const identity = { uid: "buyer", email: "buyer@example.com" },
  account = { balanceCents: 0, creditLimitCents: 10000, contactName: "Buyer" };
const input = {
  items: [{ productId: "mango", boxes: 2 }],
  address: "Mogadishu",
  onCredit: true,
};
test("order uses server prices and preserves exact integer totals", () => {
  const o = createOrder(input, stock, identity, account, "1", "2026-10-08");
  assert.equal(o.totalCents, 7632);
  assert.equal(o.paidCents, 0);
  assert.equal(o.status, "Confirmed");
});
test("overselling, duplicate lines and unconfigured prices rejected", () => {
  assert.throws(() =>
    createOrder(
      { ...input, items: [{ productId: "mango", boxes: 9 }] },
      stock,
      identity,
      account,
      "1",
      "now",
    ),
  );
  assert.throws(() =>
    createOrder(
      { ...input, items: [...input.items, ...input.items] },
      stock,
      identity,
      account,
      "1",
      "now",
    ),
  );
  assert.throws(() => createOrder(input, {}, identity, account, "1", "now"));
});
test("credit cannot exceed the approved limit", () => {
  assert.throws(() =>
    createOrder(
      input,
      stock,
      identity,
      { ...account, balanceCents: 5000 },
      "1",
      "now",
    ),
  );
});
test("customer cannot manipulate warehouse status", () => {
  const o = createOrder(input, stock, identity, account, "1", "now");
  assert.throws(() =>
    transition(o, "Preparing", identity, "customer", {}, "now"),
  );
});
test("cash order cannot be prepared before verified payment", () => {
  const o = createOrder(
    { ...input, onCredit: false },
    stock,
    identity,
    account,
    "1",
    "now",
  );
  assert.throws(() =>
    transition(o, "Preparing", { uid: "warehouse" }, "warehouse", {}, "now"),
  );
});
test("complete journey respects driver assignment, proof and notifications", () => {
  let o = createOrder(input, stock, identity, account, "1", "now");
  o = transition(o, "Preparing", { uid: "w" }, "warehouse", {}, "now");
  o = transition(
    o,
    "Ready for collection",
    { uid: "w" },
    "warehouse",
    {},
    "now",
  );
  assert.throws(() =>
    transition(o, "Left warehouse", { uid: "d" }, "driver", {}, "now"),
  );
  o.driverUid = "d";
  o = transition(o, "Left warehouse", { uid: "d" }, "driver", {}, "now");
  assert.throws(() =>
    transition(o, "Arrived", { uid: "other" }, "driver", {}, "now"),
  );
  o = transition(o, "Arrived", { uid: "d" }, "driver", {}, "now");
  assert.throws(() =>
    transition(o, "Delivered", { uid: "d" }, "driver", {}, "now"),
  );
  o = transition(
    o,
    "Delivered",
    { uid: "d" },
    "driver",
    { proofPath: "private/photo.jpg", recipient: "Receiver" },
    "now",
  );
  assert.equal(o.events.length, 6);
  assert.equal(o.notifications.length, 2);
  assert.equal(o.invoiceNumber, "INV-1");
  assert.throws(() =>
    transition(o, "Delivered", { uid: "d" }, "driver", {}, "now"),
  );
});
