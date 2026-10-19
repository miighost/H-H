import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  runTransaction,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  ALL_ROLES,
  CEO_EMAIL,
  Fault,
  STAFF_ROLES,
  catalog,
  createOrder,
  integer,
  text,
  transition,
  type AccountData,
  type OrderData,
  type Stock,
} from "./tradeDomain";

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function now() {
  return new Date().toISOString();
}

function accountRef(uid: string) {
  return doc(db, "hhAccounts", uid);
}

async function resolveRole(uid: string, email: string | null | undefined) {
  if ((email || "").toLowerCase() === CEO_EMAIL.toLowerCase()) return "ceo";
  const snap = await getDoc(accountRef(uid));
  const role = snap.exists() ? String(snap.data().role || "customer") : "customer";
  if (!(ALL_ROLES as readonly string[]).includes(role))
    throw new Fault("This account role is not configured.", 403);
  return role;
}

function requireStaff(role: string) {
  if (!(STAFF_ROLES as readonly string[]).includes(role))
    throw new Fault("Staff access is required.", 403);
}

function requireOwner(role: string) {
  if (!["admin", "ceo"].includes(role))
    throw new Fault("Administrator access is required.", 403);
}

function allowed(role: string, uid: string, order: OrderData) {
  if (role === "staff")
    throw new Fault("Order access is not available to this staff role.", 403);
  if (role === "customer" && order.customerUid !== uid)
    throw new Fault("This order is not yours.", 403);
  if (role === "driver" && order.driverUid !== uid)
    throw new Fault("This delivery is not assigned to you.", 403);
}

async function ensureInventorySeeded() {
  const snaps = await Promise.all(
    catalog.map((p) => getDoc(doc(db, "hhInventory", p.id))),
  );
  await Promise.all(
    catalog.map(async (p, i) => {
      if (snaps[i].exists()) return;
      await setDoc(doc(db, "hhInventory", p.id), {
        onHandBoxes: 0,
        reservedBoxes: 0,
        priceCents: 2500,
        threshold: 10,
        tiers: [],
        updatedAt: now(),
        seeded: true,
      });
    }),
  );
}

async function getWorkspace(uid: string, role: string) {
  await ensureInventorySeeded();
  let ordersQuery;
  if (["customer", "staff"].includes(role))
    ordersQuery = query(
      collection(db, "hhOrders"),
      where("customerUid", "==", uid),
    );
  else if (role === "driver")
    ordersQuery = query(
      collection(db, "hhOrders"),
      where("driverUid", "==", uid),
    );
  else ordersQuery = collection(db, "hhOrders");

  let paymentsQuery;
  if (["driver", "staff"].includes(role))
    paymentsQuery = query(
      collection(db, "hhPayments"),
      where("customerUid", "==", "__none__"),
    );
  else if (role === "customer")
    paymentsQuery = query(
      collection(db, "hhPayments"),
      where("customerUid", "==", uid),
    );
  else paymentsQuery = collection(db, "hhPayments");

  let equipmentQuery;
  if (["driver", "staff", "customer"].includes(role))
    equipmentQuery = query(
      collection(db, "hhEquipment"),
      where("holderUid", "==", uid),
    );
  else equipmentQuery = collection(db, "hhEquipment");

  const [orders, stocks, account, payments, equipment] = await Promise.all([
    getDocs(ordersQuery),
    getDocs(collection(db, "hhInventory")),
    getDoc(accountRef(uid)),
    getDocs(paymentsQuery),
    getDocs(equipmentQuery),
  ]);

  const profiles = ["admin", "ceo", "warehouse", "sales"].includes(role)
    ? await getDocs(collection(db, "hhAccounts"))
    : null;

  return {
    role,
    uid,
    catalog: catalog.map((c) => ({ id: c.id, name: c.name })),
    account: account.exists()
      ? { uid, ...(account.data() as DocumentData) }
      : { uid, balanceCents: 0, creditLimitCents: 0 },
    orders: orders.docs
      .map((d) => {
        const data = d.data() as DocumentData;
        return {
          id: d.id,
          ...data,
          proofPath: data.proofDataUrl ? "inline" : data.proofPath,
        };
      })
      .sort((a: any, b: any) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      ),
    inventory: stocks.docs.map((d) => ({
      productId: d.id,
      ...(d.data() as DocumentData),
    })),
    payments: payments.docs.map((d) => ({
      id: d.id,
      ...(d.data() as DocumentData),
    })),
    equipment: equipment.docs.map((d) => ({
      id: d.id,
      ...(d.data() as DocumentData),
    })),
    accounts:
      profiles?.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as DocumentData),
      })) || [],
  };
}

async function saveAccount(
  uid: string,
  email: string | null | undefined,
  body: Record<string, unknown>,
) {
  const data = {
    contactName: text(body.contactName, 150),
    company: text(body.company, 150),
    address: text(body.address),
    phone: text(body.phone, 40),
    email: email || "",
    updatedAt: now(),
  };
  await runTransaction(db, async (t) => {
    const ref = accountRef(uid);
    const d = await t.get(ref);
    const existing = d.exists() ? d.data() : {};
    const role =
      (email || "").toLowerCase() === CEO_EMAIL.toLowerCase()
        ? "ceo"
        : existing.role || "customer";
    t.set(ref, {
      balanceCents: 0,
      creditLimitCents: 0,
      ...existing,
      ...data,
      role,
    });
  });
  return { ok: true };
}

async function createOrderDoc(
  uid: string,
  email: string | null | undefined,
  role: string,
  body: Record<string, unknown>,
  requestKey: string,
) {
  if (!["customer", "sales", "admin", "ceo"].includes(role))
    throw new Fault("Customer or sales account required.", 403);
  const customerUid =
    role === "customer" ? uid : text(body.customerUid, 150);
  if (!/^[\w-]+$/.test(requestKey)) throw new Fault("Invalid request key.");
  const id = (await sha256Hex(customerUid + ":" + requestKey)).slice(0, 24);
  const fingerprint = await sha256Hex(
    JSON.stringify({
      items: body.items,
      address: body.address,
      onCredit: Boolean(body.onCredit),
    }),
  );

  const order = await runTransaction(db, async (t) => {
    const ref = doc(db, "hhOrders", id);
    const prior = await t.get(ref);
    if (prior.exists()) {
      if (prior.data().requestFingerprint !== fingerprint)
        throw new Fault(
          "Request key was already used for another order.",
          409,
        );
      return { id, ...prior.data() } as OrderData;
    }
    const ar = accountRef(customerUid);
    const a = await t.get(ar);
    if (!a.exists())
      throw new Fault("Save your business account details first.", 409);
    const refs = catalog.map((p) => doc(db, "hhInventory", p.id));
    const snapshots = await Promise.all(refs.map((x) => t.get(x)));
    const inventory = Object.fromEntries(
      snapshots.map((d, i) => [
        catalog[i].id,
        d.exists() ? (d.data() as Stock) : null,
      ]),
    );
    const o = createOrder(
      body as any,
      inventory,
      { uid: customerUid, email },
      a.data() as AccountData,
      id,
      now(),
    );
    for (const line of o.lines) {
      const index = catalog.findIndex((p) => p.id === line.productId);
      const stock = inventory[line.productId]!;
      t.set(refs[index], {
        ...stock,
        reservedBoxes: stock.reservedBoxes + line.boxes,
      });
    }
    o.requestFingerprint = fingerprint;
    o.createdBy = uid;
    t.set(ref, o);
    t.set(
      ar,
      { balanceCents: ((a.data() as AccountData).balanceCents || 0) + o.totalCents },
      { merge: true },
    );
    return o;
  });
  return { order };
}

async function handleOrderStatus(
  orderId: string,
  uid: string,
  role: string,
  body: Record<string, unknown>,
) {
  let proofDataUrl: string | null = null;
  let proofPath: string | null = null;
  if (body.status === "Delivered") {
    const existing = await getDoc(doc(db, "hhOrders", orderId));
    if (!existing.exists()) throw new Fault("Order not found.", 404);
    const o = existing.data() as OrderData;
    allowed(role, uid, { ...o, id: orderId });
    if (o.status !== "Arrived")
      throw new Fault("Mark arrival before completing delivery.", 409);
    if (!["driver", "admin", "ceo"].includes(role))
      throw new Fault("Driver access is required.", 403);
    const photo = String(body.photo || "");
    const m = photo.match(
      /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!m) throw new Fault("A delivery photo is required.");
    if (photo.length > 700_000)
      throw new Fault("Photo must be under ~500 KB for client storage.");
    proofDataUrl = photo;
    proofPath = `inline/${orderId}`;
  }

  const result = await runTransaction(db, async (t) => {
    const ref = doc(db, "hhOrders", orderId);
    const d = await t.get(ref);
    if (!d.exists()) throw new Fault("Order not found.", 404);
    const o = { id: orderId, ...d.data() } as OrderData;
    allowed(role, uid, o);
    const updated = transition(
      o,
      String(body.status),
      { uid },
      role,
      {
        ...body,
        proofPath,
        proofDataUrl,
        recipient: body.recipient as string | undefined,
      },
      now(),
    );
    if (body.status === "Left warehouse") {
      for (const line of o.lines) {
        const iref = doc(db, "hhInventory", line.productId);
        const s = await t.get(iref);
        const stock = s.data() as Stock | undefined;
        if (
          !stock ||
          stock.onHandBoxes < line.boxes ||
          stock.reservedBoxes < line.boxes
        )
          throw new Fault(
            "Reserved stock is inconsistent. Contact warehouse.",
            409,
          );
        t.update(iref, {
          onHandBoxes: stock.onHandBoxes - line.boxes,
          reservedBoxes: stock.reservedBoxes - line.boxes,
        });
      }
    }
    t.set(ref, updated);
    return updated;
  });
  const { proofDataUrl: _p, ...safe } = result as OrderData & {
    proofDataUrl?: string;
  };
  return { order: { ...safe, proofPath: result.proofDataUrl ? "inline" : result.proofPath } };
}

async function listCollection(name: string) {
  const rows = await getDocs(collection(db, name));
  return rows.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function handleModules(role: string) {
  requireStaff(role);
  const names = [
    "hhAlerts",
    "hhAttendance",
    "hhIntakes",
    "hhBatches",
    "hhVisits",
    "hhTrials",
    "hhNotes",
    "hhExpenses",
    "hhForecasts",
  ] as const;
  const [
    alerts,
    attendance,
    intakes,
    batches,
    visits,
    trials,
    notes,
    expenses,
    forecasts,
  ] = await Promise.all(names.map((n) => listCollection(n)));
  return {
    alerts,
    attendance,
    intakes,
    batches,
    visits,
    trials,
    notes,
    expenses,
    forecasts,
    raw: [],
  };
}

/**
 * Client-side operations API backed by Firebase Auth + Firestore.
 * Same call shape as the former Express `/api/operations` routes.
 */
export async function portalApi(path: string, body?: unknown): Promise<any> {
  const user = auth.currentUser;
  if (!user) throw new Fault("Please sign in.", 401);
  const uid = user.uid;
  const email = user.email;
  const role = await resolveRole(uid, email);
  const payload = (body || {}) as Record<string, unknown>;
  const isWrite = body !== undefined;

  try {
    if (path === "/workspace" && !isWrite)
      return await getWorkspace(uid, role);

    if (path === "/account" && isWrite)
      return await saveAccount(uid, email, payload);

    if (path === "/drivers" && !isWrite) {
      requireStaff(role);
      if (!["warehouse", "admin", "ceo"].includes(role))
        throw new Fault("Warehouse access required.", 403);
      const rows = await getDocs(
        query(collection(db, "hhAccounts"), where("role", "==", "driver")),
      );
      return {
        drivers: rows.docs.map((d) => ({
          uid: d.id,
          name:
            d.data().contactName ||
            d.data().company ||
            d.data().email ||
            d.id,
        })),
      };
    }

    if (path === "/prospects" && !isWrite) {
      if (!["admin", "ceo", "sales"].includes(role))
        throw new Fault("Sales access required.", 403);
      return { prospects: await listCollection("hhProspects") };
    }

    if (path === "/prospects" && isWrite) {
      if (!["admin", "ceo", "sales"].includes(role))
        throw new Fault("Sales access required.", 403);
      const data = {
        company: text(payload.company, 150),
        contactName: text(payload.contactName, 150),
        phone: text(payload.phone, 40),
        stage: text(payload.stage, 100),
        notes: String(payload.notes || "").slice(0, 2000),
        updatedAt: now(),
        updatedBy: uid,
      };
      const ref = payload.id
        ? doc(db, "hhProspects", text(payload.id, 100))
        : doc(collection(db, "hhProspects"));
      await setDoc(ref, data, { merge: true });
      return { id: ref.id };
    }

    const activate = path.match(/^\/prospects\/([^/]+)\/activate$/);
    if (activate && isWrite) {
      if (!["admin", "ceo", "sales"].includes(role))
        throw new Fault("Sales access required.", 403);
      await updateDoc(doc(db, "hhProspects", activate[1]), {
        stage: "Activated",
        activatedAt: now(),
        activatedBy: uid,
        ...payload,
      });
      return { ok: true };
    }

    if (path === "/orders" && isWrite) {
      const key =
        String(payload.requestKey || crypto.randomUUID());
      return await createOrderDoc(uid, email, role, payload, key);
    }

    const orderGet = path.match(/^\/orders\/([^/]+)$/);
    if (orderGet && !isWrite) {
      const d = await getDoc(doc(db, "hhOrders", orderGet[1]));
      if (!d.exists()) throw new Fault("Order not found.", 404);
      const o = { id: d.id, ...d.data() } as OrderData;
      allowed(role, uid, o);
      return { order: { ...o, proofPath: o.proofDataUrl ? "inline" : o.proofPath } };
    }

    const assign = path.match(/^\/orders\/([^/]+)\/assign$/);
    if (assign && isWrite) {
      requireStaff(role);
      const driverUid = text(payload.driverUid, 150);
      const driver = await getDoc(accountRef(driverUid));
      if (!driver.exists() || driver.data().role !== "driver")
        throw new Fault("Select an authorised driver.");
      const start = Date.parse(String(payload.windowStart));
      const end = Date.parse(String(payload.windowEnd));
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        throw new Fault("Enter a valid delivery window.");
      await runTransaction(db, async (t) => {
        const ref = doc(db, "hhOrders", assign[1]);
        const d = await t.get(ref);
        if (!d.exists()) throw new Fault("Order not found.", 404);
        if (
          ["Delivered", "Cancelled", "Left warehouse", "Arrived"].includes(
            d.data().status,
          )
        )
          throw new Fault("This order cannot be reassigned.", 409);
        t.update(ref, {
          driverUid,
          driverName:
            driver.data().contactName ||
            driver.data().email ||
            "Driver",
          windowStart: new Date(start).toISOString(),
          windowEnd: new Date(end).toISOString(),
        });
      });
      return { ok: true };
    }

    const status = path.match(/^\/orders\/([^/]+)\/status$/);
    if (status && isWrite)
      return await handleOrderStatus(status[1], uid, role, payload);

    const cancel = path.match(/^\/orders\/([^/]+)\/cancel$/);
    if (cancel && isWrite) {
      await runTransaction(db, async (t) => {
        const ref = doc(db, "hhOrders", cancel[1]);
        const d = await t.get(ref);
        if (!d.exists()) throw new Fault("Order not found.", 404);
        const o = { id: cancel[1], ...d.data() } as OrderData;
        allowed(role, uid, o);
        if (!["customer", "warehouse", "admin", "ceo"].includes(role))
          throw new Fault("Cancellation access denied.", 403);
        if (o.status === "Cancelled") return;
        if (
          !["Confirmed", "Preparing", "Ready for collection"].includes(o.status)
        )
          throw new Fault("Dispatched orders cannot be cancelled here.", 409);
        for (const line of o.lines) {
          const iref = doc(db, "hhInventory", line.productId);
          const s = await t.get(iref);
          const stock = s.data() as Stock;
          if (stock.reservedBoxes < line.boxes)
            throw new Fault("Reservation mismatch.", 409);
          t.update(iref, {
            reservedBoxes: stock.reservedBoxes - line.boxes,
          });
        }
        const ar = accountRef(o.customerUid);
        const a = await t.get(ar);
        if (a.exists())
          t.update(ar, {
            balanceCents: Math.max(
              0,
              ((a.data() as AccountData).balanceCents || 0) - o.totalCents,
            ),
          });
        t.update(ref, {
          status: "Cancelled",
          events: [
            ...o.events,
            { status: "Cancelled", at: now(), by: uid },
          ],
        });
      });
      return { ok: true };
    }

    const applyCredit = path.match(/^\/orders\/([^/]+)\/apply-credit$/);
    if (applyCredit && isWrite) {
      await runTransaction(db, async (t) => {
        const ref = doc(db, "hhOrders", applyCredit[1]);
        const d = await t.get(ref);
        if (!d.exists()) throw new Fault("Order not found.", 404);
        const o = { id: applyCredit[1], ...d.data() } as OrderData;
        allowed(role, uid, o);
        if (!["customer", "admin", "ceo"].includes(role))
          throw new Fault("Account access required.", 403);
        const ar = accountRef(o.customerUid);
        const a = await t.get(ar);
        const other = await getDocs(
          query(
            collection(db, "hhOrders"),
            where("customerUid", "==", o.customerUid),
          ),
        );
        const outstanding = other.docs.reduce(
          (s, x) =>
            s + Math.max(0, x.data().totalCents - x.data().paidCents),
          0,
        );
        const unallocated = Math.max(
          0,
          outstanding - ((a.data() as AccountData)?.balanceCents || 0),
        );
        const amount = Math.min(o.totalCents - o.paidCents, unallocated);
        if (amount <= 0)
          throw new Fault("No unallocated account credit is available.", 409);
        t.update(ref, { paidCents: o.paidCents + amount });
        const pr = doc(collection(db, "hhPayments"));
        t.set(pr, {
          customerUid: o.customerUid,
          orderId: o.id,
          amountCents: amount,
          reference: "Account credit allocation " + pr.id,
          at: now(),
          recordedBy: uid,
          method: "Account credit allocation",
          allocationOnly: true,
        });
      });
      return { ok: true };
    }

    const destination = path.match(/^\/orders\/([^/]+)\/destination$/);
    if (destination && isWrite) {
      requireStaff(role);
      const latitude = Number(payload.latitude);
      const longitude = Number(payload.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        throw new Fault("Enter valid coordinates.");
      const ref = doc(db, "hhOrders", destination[1]);
      const d = await getDoc(ref);
      if (!d.exists()) throw new Fault("Order not found.", 404);
      if (["Delivered", "Cancelled"].includes(d.data().status))
        throw new Fault("Completed order destination is locked.", 409);
      await updateDoc(ref, { destination: { latitude, longitude } });
      return { ok: true };
    }

    const issue = path.match(/^\/orders\/([^/]+)\/issue$/);
    if (issue && isWrite) {
      if (role !== "driver") throw new Fault("Driver access required.", 403);
      const ref = doc(db, "hhOrders", issue[1]);
      const d = await getDoc(ref);
      if (!d.exists()) throw new Fault("Order not found.", 404);
      allowed(role, uid, { id: issue[1], ...d.data() } as OrderData);
      const reason = text(payload.reason, 1000);
      await updateDoc(ref, { deliveryIssue: reason, issueAt: now() });
      await setDoc(doc(db, "hhAlerts", "issue-" + issue[1]), {
        type: "Delivery issue",
        orderId: issue[1],
        roles: ["warehouse", "admin", "ceo"],
        active: true,
        message: reason,
        firstSeen: now(),
      });
      return { ok: true };
    }

    const locations = path.match(/^\/orders\/([^/]+)\/locations$/);
    if (locations && isWrite) {
      if (role !== "driver") throw new Fault("Driver access required.", 403);
      const events = payload.events;
      if (!Array.isArray(events) || !events.length || events.length > 100)
        throw new Fault("Send between 1 and 100 locations.");
      const ref = doc(db, "hhOrders", locations[1]);
      const d = await getDoc(ref);
      if (!d.exists()) throw new Fault("Order not found.", 404);
      allowed(role, uid, { id: locations[1], ...d.data() } as OrderData);
      const last = events[events.length - 1] as DocumentData;
      await updateDoc(ref, {
        location: {
          latitude: Number(last.latitude),
          longitude: Number(last.longitude),
          at: String(last.capturedAt || now()),
        },
        locationEvents: events.slice(-50),
      });
      return { ok: true };
    }

    const location = path.match(/^\/orders\/([^/]+)\/location$/);
    if (location && isWrite) {
      return portalApi(`/orders/${location[1]}/locations`, {
        events: [
          {
            ...payload,
            eventId: crypto.randomUUID(),
            capturedAt: now(),
          },
        ],
      });
    }

    const routeHistory = path.match(/^\/orders\/([^/]+)\/route-history$/);
    if (routeHistory && !isWrite) {
      const d = await getDoc(doc(db, "hhOrders", routeHistory[1]));
      if (!d.exists()) throw new Fault("Order not found.", 404);
      const o = { id: d.id, ...d.data() } as OrderData;
      allowed(role, uid, o);
      return { points: (o as any).locationEvents || [] };
    }

    const checkout = path.match(/^\/orders\/([^/]+)\/checkout$/);
    if (checkout && isWrite)
      throw new Fault(
        "Card/mobile checkout is not configured on this host. Ask staff to record a verified receipt, or pay on delivery.",
        501,
      );

    const reconcile = path.match(/^\/orders\/([^/]+)\/reconcile-payment$/);
    if (reconcile && isWrite) {
      requireOwner(role);
      const amountCents = integer(
        Math.round(Number(payload.amount || payload.amountCents) * (payload.amount ? 100 : 1)),
        1,
      );
      const reference = text(payload.reference || `manual-${Date.now()}`, 150);
      return portalApi("/payments", {
        customerUid: payload.customerUid,
        orderId: reconcile[1],
        amountCents,
        reference,
      });
    }

    if (path === "/payments" && isWrite) {
      requireOwner(role);
      const customerUid = text(payload.customerUid, 150);
      const amountCents = integer(
        payload.amountCents ??
          Math.round(Number(payload.amount) * 100),
        1,
      );
      const reference = text(payload.reference, 150);
      const id = await sha256Hex(reference);
      await runTransaction(db, async (t) => {
        const pr = doc(db, "hhPayments", id);
        const existing = await t.get(pr);
        if (existing.exists()) {
          if (
            existing.data().amountCents !== amountCents ||
            existing.data().customerUid !== customerUid ||
            (existing.data().orderId || null) !== (payload.orderId || null)
          )
            throw new Fault(
              "Reference already used for a different payment.",
              409,
            );
          return;
        }
        const ar = accountRef(customerUid);
        const a = await t.get(ar);
        if (!a.exists()) throw new Fault("Customer account not found.", 404);
        let order: OrderData | undefined;
        let or;
        if (payload.orderId) {
          or = doc(db, "hhOrders", text(payload.orderId, 100));
          const od = await t.get(or);
          const odData = od.exists()
            ? (od.data() as DocumentData)
            : undefined;
          if (!odData || odData.customerUid !== customerUid)
            throw new Fault("Payment order does not match customer.");
          order = { id: od.id, ...odData } as OrderData;
          if (order.paidCents + amountCents > order.totalCents)
            throw new Fault(
              "Payment exceeds order balance. Record excess as account deposit.",
            );
        }
        t.set(pr, {
          customerUid,
          orderId: payload.orderId || null,
          amountCents,
          reference,
          at: now(),
          recordedBy: uid,
          method: "Verified external receipt",
        });
        t.update(ar, {
          balanceCents:
            ((a.data() as AccountData).balanceCents || 0) - amountCents,
        });
        if (or && order)
          t.update(or, { paidCents: order.paidCents + amountCents });
      });
      return { ok: true };
    }

    const inventory = path.match(/^\/inventory\/([^/]+)$/);
    if (inventory && isWrite) {
      requireStaff(role);
      if (!["warehouse", "admin", "ceo"].includes(role))
        throw new Fault("Warehouse access required.", 403);
      if (!catalog.some((p) => p.id === inventory[1]))
        throw new Fault("Unknown product.");
      const boxes = integer(payload.onHandBoxes);
      const priceCents = integer(payload.priceCents, 1);
      const threshold = integer(payload.threshold ?? 0);
      const tiers = (payload.tiers as any[]) || [];
      await runTransaction(db, async (t) => {
        const ref = doc(db, "hhInventory", inventory[1]);
        const d = await t.get(ref);
        const reserved = d.data()?.reservedBoxes || 0;
        if (boxes < reserved)
          throw new Fault("Physical stock cannot be below reserved stock.");
        t.set(ref, {
          onHandBoxes: boxes,
          reservedBoxes: reserved,
          priceCents,
          threshold,
          tiers,
          updatedAt: now(),
          updatedBy: uid,
        });
      });
      return { ok: true };
    }

    const credit = path.match(/^\/accounts\/([^/]+)\/credit$/);
    if (credit && isWrite) {
      requireOwner(role);
      await setDoc(
        accountRef(credit[1]),
        {
          creditLimitCents: integer(
            payload.creditLimitCents ??
              Math.round(Number(payload.creditLimit) * 100),
          ),
          updatedBy: uid,
        },
        { merge: true },
      );
      return { ok: true };
    }

    const pricing = path.match(/^\/accounts\/([^/]+)\/pricing$/);
    if (pricing && isWrite) {
      requireOwner(role);
      await setDoc(
        accountRef(pricing[1]),
        {
          productPrices: payload.productPrices || payload,
          updatedBy: uid,
          updatedAt: now(),
        },
        { merge: true },
      );
      return { ok: true };
    }

    if (path === "/equipment" && isWrite) {
      requireStaff(role);
      const data = {
        name: text(payload.name, 150),
        quantity: integer(payload.quantity, 1),
        holderUid: payload.holderUid
          ? text(payload.holderUid, 150)
          : null,
        ownership: text(payload.ownership, 100),
        updatedAt: now(),
        updatedBy: uid,
      };
      const ref = payload.id
        ? doc(db, "hhEquipment", text(payload.id, 100))
        : doc(collection(db, "hhEquipment"));
      await setDoc(ref, data, { merge: true });
      return { id: ref.id };
    }

    const eqReturn = path.match(/^\/equipment\/([^/]+)\/return$/);
    if (eqReturn && isWrite) {
      requireStaff(role);
      const ref = doc(db, "hhEquipment", eqReturn[1]);
      await runTransaction(db, async (t) => {
        const d = await t.get(ref);
        if (!d.exists()) throw new Fault("Equipment not found.", 404);
        const item = d.data();
        t.update(ref, {
          holderUid: null,
          history: [
            ...(item.history || []),
            {
              holderUid: item.holderUid,
              action: "Returned",
              at: now(),
              by: uid,
            },
          ],
          updatedAt: now(),
        });
      });
      return { ok: true };
    }

    if (path === "/modules" && !isWrite) return await handleModules(role);

    if (path === "/staff" && !isWrite) {
      requireOwner(role);
      const rows = await getDocs(collection(db, "hhAccounts"));
      return {
        staff: rows.docs
          .filter((d) => d.data().role && d.data().role !== "customer")
          .map((d) => ({
            uid: d.id,
            name: d.data().contactName || d.data().email,
            email: d.data().email,
            role: d.data().role,
            disabled: false,
          })),
      };
    }

    if (path === "/staff" && isWrite) {
      requireOwner(role);
      throw new Fault(
        "Create staff in Firebase Auth, then set role on their hhAccounts document (driver, warehouse, sales, admin).",
        501,
      );
    }

    const staffDisable = path.match(/^\/staff\/([^/]+)\/disable$/);
    if (staffDisable && isWrite) {
      requireOwner(role);
      throw new Fault(
        "Disable users from the Firebase Auth console on Spark hosting.",
        501,
      );
    }

    // Generic create/list for operational module collections
    const moduleMap: Record<string, string> = {
      "/intakes": "hhIntakes",
      "/batches": "hhBatches",
      "/visits": "hhVisits",
      "/trials": "hhTrials",
      "/forecasts": "hhForecasts",
      "/expenses": "hhExpenses",
      "/executive-notes": "hhNotes",
      "/alerts": "hhAlerts",
      "/attendance": "hhAttendance",
    };
    if (moduleMap[path] && isWrite) {
      requireStaff(role);
      const ref = doc(collection(db, moduleMap[path]));
      await setDoc(ref, { ...payload, createdAt: now(), createdBy: uid });
      return { id: ref.id };
    }

    const batchAdvance = path.match(/^\/batches\/([^/]+)\/advance$/);
    if (batchAdvance && isWrite) {
      requireStaff(role);
      await updateDoc(doc(db, "hhBatches", batchAdvance[1]), {
        ...payload,
        updatedAt: now(),
        updatedBy: uid,
      });
      return { ok: true };
    }

    const trialReconcile = path.match(/^\/trials\/([^/]+)\/reconcile$/);
    if (trialReconcile && isWrite) {
      requireStaff(role);
      await updateDoc(doc(db, "hhTrials", trialReconcile[1]), {
        status: "Reconciled",
        ...payload,
        reconciledAt: now(),
        reconciledBy: uid,
      });
      return { ok: true };
    }

    const alertAck = path.match(/^\/alerts\/([^/]+)\/acknowledge$/);
    if (alertAck && isWrite) {
      requireStaff(role);
      await updateDoc(doc(db, "hhAlerts", alertAck[1]), {
        active: false,
        acknowledgedAt: now(),
        acknowledgedBy: uid,
      });
      return { ok: true };
    }

    if (path === "/attendance/punch" && isWrite) {
      requireStaff(role);
      const ref = doc(collection(db, "hhAttendance"));
      await setDoc(ref, {
        ...payload,
        uid,
        at: now(),
      });
      return { id: ref.id };
    }

    if (
      (path === "/attendance/config" || path === "/attendance/shift") &&
      isWrite
    ) {
      requireStaff(role);
      await setDoc(doc(db, "hhAttendanceConfig", "default"), {
        ...payload,
        updatedAt: now(),
      }, { merge: true });
      return { ok: true };
    }

    if (path === "/routes/plan" && isWrite) {
      requireStaff(role);
      return {
        route: [],
        message: "Route planning runs locally; assign drivers on each order.",
      };
    }

    throw new Fault("API endpoint not found.", 404);
  } catch (e) {
    if (e instanceof Fault) throw e;
    const message =
      e instanceof Error ? e.message : "The record could not be saved.";
    if (/permission|insufficient/i.test(message))
      throw new Fault(
        "Firestore permission denied. Confirm you are signed in and rules are deployed.",
        403,
      );
    throw new Fault(message, 500);
  }
}

/** Resolve delivery proof for display (inline data URL from Firestore). */
export async function getOrderProofDataUrl(
  orderId: string,
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) throw new Fault("Please sign in.", 401);
  const d = await getDoc(doc(db, "hhOrders", orderId));
  if (!d.exists()) throw new Fault("Order not found.", 404);
  const role = await resolveRole(user.uid, user.email);
  const o = { id: d.id, ...d.data() } as OrderData;
  allowed(role, user.uid, o);
  return o.proofDataUrl || null;
}
