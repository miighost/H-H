export const catalog = [
  { id: "mango", name: "Mango" },
  { id: "papaya", name: "Papaya" },
  { id: "banana-lady-soft", name: "Banana - Lady Soft" },
  { id: "banana-lady-spicy", name: "Banana - Lady Spicy" },
  { id: "isbaandheys", name: "Isbaandheys" },
];
export class Fault extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function integer(value, min = 0) {
  if (!Number.isSafeInteger(value) || value < min)
    throw new Fault("Enter a valid whole number.");
  return value;
}
export function text(value, max = 500) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Fault("A valid value is required.");
  return value.trim();
}
export function createOrder(input, inventory, identity, account, id, now) {
  if (
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 5
  )
    throw new Fault("Select one to five products.");
  const ids = new Set();
  const lines = input.items.map((i) => {
    if (ids.has(i.productId)) throw new Fault("Duplicate product.");
    ids.add(i.productId);
    const p = catalog.find((p) => p.id === i.productId);
    if (!p) throw new Fault("Unknown product.");
    const boxes = integer(i.boxes, 1);
    if (boxes > 10000) throw new Fault("Quantity is too large.");
    const s = inventory[i.productId];
    if (!s || !Number.isSafeInteger(s.priceCents) || s.priceCents <= 0)
      throw new Fault("The approved price has not been configured.", 409);
    if (boxes > s.onHandBoxes - s.reservedBoxes)
      throw new Fault(`${p.name}: insufficient available stock.`, 409);
    const tiers = Array.isArray(s.tiers)
      ? s.tiers
          .filter(
            (t) =>
              Number.isSafeInteger(t.minimumBoxes) &&
              Number.isSafeInteger(t.priceCents) &&
              t.priceCents > 0 &&
              boxes >= t.minimumBoxes,
          )
          .sort((a, b) => b.minimumBoxes - a.minimumBoxes)
      : [];
    const contract = account.productPrices?.[p.id];
    const unitPriceCents =
      Number.isSafeInteger(contract) && contract > 0
        ? contract
        : tiers[0]?.priceCents || s.priceCents;
    return {
      productId: p.id,
      productName: p.name,
      boxes,
      unitPriceCents,
      amountCents: boxes * unitPriceCents,
    };
  });
  const totalCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
  integer(totalCents, 1);
  if (
    input.onCredit &&
    (account.balanceCents || 0) + totalCents > (account.creditLimitCents || 0)
  )
    throw new Fault("This order exceeds your approved credit limit.", 409);
  return {
    id,
    customerUid: identity.uid,
    customerName: account.contactName || identity.email,
    company: account.company || "",
    address: text(input.address),
    lines,
    totalCents,
    paidCents: 0,
    onCredit: Boolean(input.onCredit),
    status: "Confirmed",
    createdAt: now,
    driverUid: null,
    events: [{ status: "Confirmed", at: now, by: identity.uid }],
    notifications: [],
  };
}
export function transition(order, next, identity, role, input, now) {
  const flow = {
    Confirmed: "Preparing",
    Preparing: "Ready for collection",
    "Ready for collection": "Left warehouse",
    "Left warehouse": "Arrived",
    Arrived: "Delivered",
  };
  if (flow[order.status] !== next)
    throw new Fault("This order cannot move to that stage.", 409);
  const delivery = ["Left warehouse", "Arrived", "Delivered"].includes(next);
  if (delivery) {
    if (
      role !== "admin" &&
      role !== "ceo" &&
      (role !== "driver" || order.driverUid !== identity.uid)
    )
      throw new Fault(
        "Only the assigned driver can update this delivery.",
        403,
      );
  } else if (!["warehouse", "admin", "ceo"].includes(role))
    throw new Fault("Warehouse access is required.", 403);
  if (
    next === "Preparing" &&
    !order.onCredit &&
    order.paidCents < order.totalCents
  )
    throw new Fault("Payment must be verified before preparation.", 409);
  if (next === "Left warehouse" && !order.driverUid)
    throw new Fault("Assign a driver first.", 409);
  if (next === "Delivered" && (!input.proofPath || !input.recipient?.trim()))
    throw new Fault("A delivery photo and receiver full name are mandatory.");
  const updated = {
    ...order,
    status: next,
    events: [...order.events, { status: next, at: now, by: identity.uid }],
  };
  if (next === "Delivered") {
    updated.proofPath = input.proofPath;
    updated.recipient = text(input.recipient, 150);
    updated.invoiceNumber = `INV-${order.id}`;
    updated.invoiceDate = now;
  }
  if (next === "Left warehouse" || next === "Delivered")
    updated.notifications = [
      ...(order.notifications || []),
      {
        at: now,
        message:
          next === "Delivered"
            ? "YOUR ORDER HAS BEEN DELIVERED — COMPLETE"
            : "YOUR ORDER HAS LEFT THE WAREHOUSE — ON THE WAY",
      },
    ];
  return updated;
}
