export const catalog = [
  { id: "mango", name: "Mango" },
  { id: "papaya", name: "Papaya" },
  { id: "banana-lady-soft", name: "Banana - Lady Soft" },
  { id: "banana-lady-spicy", name: "Banana - Lady Spicy" },
  { id: "isbaandheys", name: "Isbaandheys" },
] as const;

export type CatalogId = (typeof catalog)[number]["id"];

export class Fault extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function integer(value: unknown, min = 0): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isSafeInteger(n) || (n as number) < min)
    throw new Fault("Enter a valid whole number.");
  return n as number;
}

export function text(value: unknown, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Fault("A valid value is required.");
  return value.trim();
}

export type Stock = {
  onHandBoxes: number;
  reservedBoxes: number;
  priceCents: number;
  threshold?: number;
  tiers?: { minimumBoxes: number; priceCents: number }[];
};

export type AccountData = {
  contactName?: string;
  company?: string;
  address?: string;
  phone?: string;
  email?: string;
  role?: string;
  balanceCents?: number;
  creditLimitCents?: number;
  productPrices?: Record<string, number>;
};

export type OrderLine = {
  productId: string;
  productName: string;
  boxes: number;
  unitPriceCents: number;
  amountCents: number;
};

export type OrderData = {
  id: string;
  customerUid: string;
  customerName: string;
  company: string;
  address: string;
  lines: OrderLine[];
  totalCents: number;
  paidCents: number;
  onCredit: boolean;
  status: string;
  createdAt: string;
  driverUid: string | null;
  driverName?: string;
  events: { status: string; at: string; by?: string }[];
  notifications: { message: string; at: string }[];
  requestFingerprint?: string;
  createdBy?: string;
  proofPath?: string;
  proofDataUrl?: string;
  recipient?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  windowStart?: string;
  windowEnd?: string;
  destination?: { latitude: number; longitude: number };
  deliveryIssue?: string;
  location?: { latitude: number; longitude: number; at: string };
  [key: string]: unknown;
};

export function createOrder(
  input: {
    items: { productId: string; boxes: number }[];
    address: string;
    onCredit?: boolean;
  },
  inventory: Record<string, Stock | null>,
  identity: { uid: string; email?: string | null },
  account: AccountData,
  id: string,
  now: string,
): OrderData {
  if (
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 5
  )
    throw new Fault("Select one to five products.");
  const ids = new Set<string>();
  const lines = input.items.map((i) => {
    if (ids.has(i.productId)) throw new Fault("Duplicate product.");
    ids.add(i.productId);
    const p = catalog.find((c) => c.id === i.productId);
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
      Number.isSafeInteger(contract) && (contract as number) > 0
        ? (contract as number)
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
    customerName: account.contactName || identity.email || "",
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

export function transition(
  order: OrderData,
  next: string,
  identity: { uid: string },
  role: string,
  input: {
    proofPath?: string | null;
    proofDataUrl?: string | null;
    recipient?: string;
  },
  now: string,
): OrderData {
  const flow: Record<string, string> = {
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
  if (
    next === "Delivered" &&
    (!input.proofPath && !input.proofDataUrl || !input.recipient?.trim())
  )
    throw new Fault("A delivery photo and receiver full name are mandatory.");
  const updated: OrderData = {
    ...order,
    status: next,
    events: [...order.events, { status: next, at: now, by: identity.uid }],
  };
  if (next === "Delivered") {
    updated.proofPath = input.proofPath || "inline";
    if (input.proofDataUrl) updated.proofDataUrl = input.proofDataUrl;
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

export const CEO_EMAIL = "info@hornandharvest.com";
export const STAFF_ROLES = ["admin", "ceo", "warehouse", "sales"] as const;
export const ALL_ROLES = [
  "customer",
  "warehouse",
  "driver",
  "sales",
  "admin",
  "ceo",
  "staff",
] as const;
