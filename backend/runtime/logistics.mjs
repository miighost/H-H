import { Fault, text } from "./domain.mjs";
export function coordinates(value) {
  const latitude = Number(value?.latitude),
    longitude = Number(value?.longitude);
  if (
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  )
    throw new Fault("Valid latitude and longitude are required.");
  return { latitude, longitude };
}
export function metres(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const dlat = rad(b.latitude - a.latitude),
    dlon = rad(b.longitude - a.longitude);
  return (
    6371000 *
    2 *
    Math.atan2(
      Math.sqrt(
        Math.sin(dlat / 2) ** 2 +
          Math.cos(rad(a.latitude)) *
            Math.cos(rad(b.latitude)) *
            Math.sin(dlon / 2) ** 2,
      ),
      Math.sqrt(
        1 -
          (Math.sin(dlat / 2) ** 2 +
            Math.cos(rad(a.latitude)) *
              Math.cos(rad(b.latitude)) *
              Math.sin(dlon / 2) ** 2),
      ),
    )
  );
}
export async function routeMatrix(points, fetcher = fetch) {
  const base = process.env.OSRM_URL;
  if (base) {
    const url = new URL(
      "/table/v1/driving/" +
        points.map((p) => `${p.longitude},${p.latitude}`).join(";"),
      base,
    );
    url.searchParams.set("annotations", "duration,distance");
    const r = await fetcher(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Fault("Road routing is unavailable.", 503);
    const d = await r.json();
    if (
      d.code !== "Ok" ||
      !d.durations?.every((row) => row.every(Number.isFinite))
    )
      throw new Fault(
        "Some stops are unreachable by the configured road data.",
        409,
      );
    return {
      durations: d.durations,
      distances: d.distances,
      method: "Self-hosted road routing",
    };
  }
  const speed = Number(process.env.ESTIMATED_SPEED_KMH || 25);
  if (!(speed > 0 && speed <= 130))
    throw new Fault("Estimated road speed configuration is invalid.", 503);
  const distances = points.map((a) => points.map((b) => metres(a, b)));
  return {
    distances,
    durations: distances.map((row) => row.map((m) => m / (speed / 3.6))),
    method: "Straight-line estimate; road routing not configured",
  };
}
export function sortStops(stops, matrix) {
  const remaining = new Set(stops.map((_, i) => i + 1)),
    sequence = [];
  let current = 0;
  while (remaining.size) {
    const next = [...remaining].sort(
      (a, b) => matrix.durations[current][a] - matrix.durations[current][b],
    )[0];
    remaining.delete(next);
    sequence.push(next);
    current = next;
  }
  const cost = (seq) =>
    seq.reduce((s, n, i) => s + matrix.durations[i ? seq[i - 1] : 0][n], 0);
  // Open route 2-opt; practical improvement, not a global optimality claim.
  for (let pass = 0; pass < 20; pass++) {
    let improved = false;
    for (let i = 0; i < sequence.length - 1; i++)
      for (let j = i + 1; j < sequence.length; j++) {
        const candidate = [
          ...sequence.slice(0, i),
          ...sequence.slice(i, j + 1).reverse(),
          ...sequence.slice(j + 1),
        ];
        if (cost(candidate) < cost(sequence) - 0.1) {
          sequence.splice(0, sequence.length, ...candidate);
          improved = true;
        }
      }
    if (!improved) break;
  }
  let elapsed = 0,
    previous = 0;
  return sequence.map((index, i) => {
    elapsed += matrix.durations[previous][index];
    const distanceMetres = matrix.distances[previous][index];
    previous = index;
    return {
      ...stops[index - 1],
      sequence: i + 1,
      legMetres: Math.round(distanceMetres),
      arrivalSeconds: Math.round(elapsed + i * 300),
    };
  });
}
export async function refreshOperationalAlerts(db) {
  const at = new Date().toISOString();
  const [stocks, orders] = await Promise.all([
    db.collection("hhInventory").get(),
    db.collection("hhOrders").get(),
  ]);
  const upsert = async (id, active, data) =>
    db.runTransaction(async (t) => {
      const ref = db.collection("hhAlerts").doc(id),
        d = await t.get(ref);
      if (active) {
        t.set(ref, {
          ...d.data(),
          ...data,
          active: true,
          firstSeen: d.data()?.firstSeen || at,
          lastSeen: at,
          acknowledgedBy: d.data()?.active
            ? d.data().acknowledgedBy || null
            : null,
        });
      } else if (d.exists && d.data().active)
        t.update(ref, { active: false, resolvedAt: at });
    });
  for (const s of stocks.docs) {
    const v = s.data(),
      available = v.onHandBoxes - v.reservedBoxes;
    await upsert("stock-" + s.id, available <= v.threshold, {
      type: "Low stock",
      productId: s.id,
      message: `${s.id}: ${available} available boxes; safe threshold ${v.threshold}.`,
      roles: ["warehouse", "admin", "ceo"],
    });
  }
  for (const doc of orders.docs) {
    const o = doc.data();
    const active =
      !["Delivered", "Cancelled"].includes(o.status) &&
      o.windowEnd &&
      (Date.now() > Date.parse(o.windowEnd) ||
        (o.eta && Date.parse(o.eta) > Date.parse(o.windowEnd)));
    await upsert("delay-" + doc.id, Boolean(active), {
      type: "Delivery delay",
      orderId: doc.id,
      customerUid: o.customerUid,
      message: `Order ${doc.id} is delayed. ${o.eta ? `Estimated arrival ${o.eta}.` : "Updated arrival is awaiting a location fix."}`,
      roles: ["warehouse", "admin", "ceo"],
    });
    if (active)
      await db.runTransaction(async (t) => {
        const ref = db.collection("hhOrders").doc(doc.id),
          d = await t.get(ref);
        const item = d.data();
        if (
          !item.delayNotifiedAt ||
          (item.eta &&
            (!item.delayNotifiedEta ||
              Math.abs(
                Date.parse(item.eta) - Date.parse(item.delayNotifiedEta),
              ) >= 300000))
        ) {
          t.update(ref, {
            delayNotifiedAt: at,
            delayNotifiedEta: item.eta || null,
            notifications: [
              ...(item.notifications || []),
              {
                at,
                message: `YOUR DELIVERY IS DELAYED — ${item.eta ? `ESTIMATED ARRIVAL: ${item.eta}` : "UPDATED ARRIVAL PENDING"}`,
              },
            ],
          });
        }
      });
  }
}
export async function refreshAbsences(db) {
  const shifts = await db.collection("hhShifts").get();
  const attendance = await db.collection("hhAttendance").get();
  for (const d of shifts.docs) {
    const s = d.data();
    if (Date.parse(s.end) > Date.now()) continue;
    const present = attendance.docs.some(
      (a) =>
        a.data().uid === s.uid &&
        a.data().day === s.day &&
        a.data().action === "in",
    );
    if (!present) {
      const ref = db.collection("hhAttendance").doc("absent-" + d.id);
      await db.runTransaction(async (t) => {
        const prior = await t.get(ref);
        if (!prior.exists)
          t.set(ref, {
            uid: s.uid,
            day: s.day,
            action: "absent",
            status: "Absent",
            at: s.end,
            hours: 0,
          });
      });
    }
  }
}
