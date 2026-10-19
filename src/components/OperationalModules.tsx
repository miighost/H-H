import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
type Api = (path: string, body?: unknown) => Promise<any>;
type Runner = (fn: () => Promise<unknown>, success?: string) => Promise<void>;
const productionSteps = [
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
const fields: Record<string, string[]> = {
  intakes: ["productId", "supplier", "lot", "receivedKg", "rejectedKg"],
  batches: ["intakeId", "inputKg"],
  visits: [
    "prospectId",
    "outcome",
    "notes",
    "followUpAt",
    "latitude",
    "longitude",
  ],
  trials: ["prospectId", "productId", "boxes", "reviewAt", "equipmentId"],
  forecasts: ["productId", "expectedKg", "expectedAt", "supplier", "note"],
  expenses: ["category", "amountUSD", "reference"],
  "executive-notes": ["kind", "title", "body", "dueAt", "status", "source"],
};
const title: Record<string, string> = {
  intakes: "Receive fresh fruit",
  batches: "Production & yield",
  visits: "Field visits",
  trials: "Trial stock & trays",
  forecasts: "Season & supply planning",
  expenses: "Recorded costs",
  notes: "Executive records",
  alerts: "Operational alerts",
  attendance: "Staff attendance",
  routes: "Delivery route",
  fleet: "Live drivers",
  staff: "Staff access",
  pricing: "Approved pricing",
};
const labels: Record<string, string> = {
  productId: "Product",
  receivedKg: "Received kg",
  rejectedKg: "Rejected kg",
  inputKg: "Input kg",
  intakeId: "Received intake ID",
  prospectId: "Prospect ID",
  reviewAt: "Review date",
  followUpAt: "Follow-up date",
  expectedAt: "Expected date",
  expectedKg: "Expected kg",
  equipmentId: "Equipment record ID (optional)",
  amountUSD: "Amount USD",
  dueAt: "Due date",
  latitude: "Latitude",
  longitude: "Longitude",
};
const numberFields = [
  "receivedKg",
  "rejectedKg",
  "inputKg",
  "expectedKg",
  "boxes",
  "latitude",
  "longitude",
  "amountUSD",
];
const money = (n: number) => "$" + (n / 100).toFixed(2);
function csvDownload(name: string, rows: any[]) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: any) =>
    '"' +
    String(typeof v === "object" ? JSON.stringify(v) : (v ?? ""))
      .replace(/^[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  const csv = [
    cols.map(cell).join(","),
    ...rows.map((r) => cols.map((c) => cell(r[c])).join(",")),
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
export function RoutePlot({
  points,
  highlight = Infinity,
}: {
  points: any[];
  highlight?: number;
}) {
  if (!points.length) return <p>No location records yet.</p>;
  const lats = points.map((p) => p.latitude),
    lons = points.map((p) => p.longitude),
    minLat = Math.min(...lats),
    maxLat = Math.max(...lats),
    minLon = Math.min(...lons),
    maxLon = Math.max(...lons);
  const x = (p: any) =>
      20 + ((p.longitude - minLon) / (maxLon - minLon || 0.001)) * 560,
    y = (p: any) =>
      260 - ((p.latitude - minLat) / (maxLat - minLat || 0.001)) * 240;
  return (
    <figure>
      <svg
        viewBox="0 0 600 280"
        role="img"
        aria-label="Recorded GPS route, coordinate plot"
        style={{ width: "100%", maxWidth: 800, background: "#F5F0E1" }}
      >
        <polyline
          points={points
            .slice(0, highlight + 1)
            .map((p) => `${x(p)},${y(p)}`)
            .join(" ")}
          fill="none"
          stroke="#1C3B2F"
          strokeWidth="3"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(p)} cy={y(p)} r="5" fill="#D4AF37" />
            <text x={x(p) + 8} y={y(p) - 8} fontSize="12">
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        Recorded coordinates; no external map service. Streets require the
        configured self-hosted road map.
      </figcaption>
    </figure>
  );
}
export function DeliveryHistory({
  orderId,
  api,
}: {
  orderId: string;
  api: Api;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [index, setIndex] = useState(0);
  useEffect(() => {
    let active = true;
    api(`/orders/${orderId}/route-history`)
      .then((d) => {
        if (active) {
          setData(d);
          setIndex(Math.max(0, d.events.length - 1));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [orderId, api]);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Loading route history…</p>;
  return (
    <section className="cp-card">
      <h3>Route history</h3>
      <p>
        {(data.distanceMetres / 1000).toFixed(2)} km recorded ·{" "}
        {Math.round(data.durationSeconds / 60)} minutes
      </p>
      <RoutePlot points={data.events} highlight={index} />
      {data.events.length > 0 && (
        <label>
          Replay recorded points
          <input
            aria-label="Route replay"
            type="range"
            min="0"
            max={data.events.length - 1}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
          />
          <span>{data.events[index]?.capturedAt}</span>
        </label>
      )}
    </section>
  );
}
export default function OperationalModules({
  section,
  api,
  run,
  role,
  orders,
  catalog,
  base,
}: {
  section: string;
  api: Api;
  run: Runner;
  role: string;
  orders: any[];
  catalog: any[];
  base: string;
}) {
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [margin, setMargin] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [route, setRoute] = useState<any>(null);
  const admin = ["admin", "ceo"].includes(role),
    wh = ["admin", "ceo", "warehouse"].includes(role),
    sell = ["admin", "ceo", "sales"].includes(role);
  const load = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const [modules, directory] = await Promise.all([
        api("/modules"),
        section === "staff" && ["admin", "ceo"].includes(role)
          ? api("/staff")
          : Promise.resolve({ staff: [] }),
      ]);
      if (auth.currentUser?.uid !== uid) return;
      setData(modules);
      setPeople(directory.staff);
      setError("");
    } catch (e) {
      if (auth.currentUser?.uid === uid) setError((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [section]);
  const save = (path: string, body: any) =>
    run(async () => {
      await api(path, body);
      await load();
    }, "Record saved.");
  const schema = fields[section === "notes" ? "executive-notes" : section];
  const collection = section === "notes" ? "notes" : section;
  const permitted = ["notes", "expenses", "staff", "pricing"].includes(section)
    ? admin
    : section === "visits" || section === "trials"
      ? sell
      : section === "intakes" ||
          section === "batches" ||
          section === "forecasts"
        ? wh
        : true;
  const punch = async (action: string) => {
    const p = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
      }),
    );
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
    });
    try {
      video.srcObject = stream;
      await video.play();
      await new Promise<void>((r) => {
        if (video.videoWidth) r();
        else video.onloadeddata = () => r();
      });
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      canvas.getContext("2d")!.drawImage(video, 0, 0, 640, 480);
      let deviceId = localStorage.getItem("hh-device-v1");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("hh-device-v1", deviceId);
      }
      await api("/attendance/punch", {
        action,
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracyMetres: p.coords.accuracy,
        photo: canvas.toDataURL("image/jpeg", 0.8),
        deviceId,
      });
      await load();
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  };
  if (!permitted)
    return (
      <section className="cp-card">
        <h2>Access restricted</h2>
        <p>This module is not available to your account role.</p>
        <a href={`${base}/overview`}>Return to overview</a>
      </section>
    );
  return (
    <section>
      <h2>{title[section] || section}</h2>
      {error && <p role="alert">{error}</p>}
      {photoPreview && (
        <div className="cp-card">
          <img
            src={photoPreview}
            alt="Recorded attendance camera snapshot"
            style={{ maxWidth: "100%" }}
          />
          <button
            onClick={() => {
              URL.revokeObjectURL(photoPreview);
              setPhotoPreview("");
            }}
          >
            Close photo
          </button>
        </div>
      )}
      {section === "pricing" && admin && (
        <form
          className="cp-card"
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            const cost = Number(f.costUSD),
              price = Number(f.priceUSD),
              qty = Number(f.quantity);
            setMargin({
              cost: cost * qty,
              sales: price * qty,
              gross: (price - cost) * qty,
              percent: price ? ((price - cost) / price) * 100 : 0,
            });
          }}
        >
          <h3>Pricing & margin calculation</h3>
          <label>
            Unit cost USD
            <input name="costUSD" required type="number" step="0.01" min="0" />
          </label>
          <label>
            Unit selling price USD
            <input
              name="priceUSD"
              required
              type="number"
              step="0.01"
              min="0.01"
            />
          </label>
          <label>
            Units
            <input name="quantity" required type="number" step="1" min="1" />
          </label>
          <button>Calculate</button>
          {margin && (
            <p>
              Revenue: {money(Math.round(margin.sales * 100))} · Cost:{" "}
              {money(Math.round(margin.cost * 100))} · Gross margin:{" "}
              {money(Math.round(margin.gross * 100))} (
              {margin.percent.toFixed(1)}%). This calculation does not create a
              transaction or include unentered operating costs.
            </p>
          )}
        </form>
      )}

      {section === "staff" && admin && (
        <>
          <form
            className="cp-card"
            onSubmit={(e) => {
              e.preventDefault();
              void save(
                "/staff",
                Object.fromEntries(new FormData(e.currentTarget)),
              );
              e.currentTarget.reset();
            }}
          >
            {["displayName", "email", "password"].map((k) => (
              <label key={k}>
                {k}
                <input
                  name={k}
                  type={
                    k === "password"
                      ? "password"
                      : k === "email"
                        ? "email"
                        : "text"
                  }
                  minLength={k === "password" ? 12 : undefined}
                  required
                />
              </label>
            ))}
            <label>
              Role
              <select name="role">
                {["staff", "warehouse", "driver", "sales"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <button>Create staff account</button>
            <p>
              Uses the existing Firebase login. Passwords are not stored in
              operational records.
            </p>
          </form>
          {people.map((p) => (
            <article className="cp-card" key={p.uid}>
              <h3>{p.name}</h3>
              <p>
                {p.uid} · {p.role} · {p.disabled ? "Disabled" : "Enabled"}
              </p>
              {!p.disabled && (
                <button
                  onClick={() => void save(`/staff/${p.uid}/disable`, {})}
                >
                  Disable access
                </button>
              )}
            </article>
          ))}
        </>
      )}
      {section === "pricing" && admin && (
        <form
          className="cp-card"
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            void save("/settings/retail-pricing", {
              pouchPriceCents: Math.round(Number(f.pouchPriceUSD) * 100),
              deliveryCents: Math.round(Number(f.deliveryUSD) * 100),
            });
          }}
        >
          <h3>Approve public retail prices</h3>
          <label>
            USD per 100 g pouch
            <input
              name="pouchPriceUSD"
              required
              type="number"
              min="0.01"
              step="0.01"
            />
          </label>
          <label>
            USD delivery per order
            <input
              name="deliveryUSD"
              required
              type="number"
              min="0"
              step="0.01"
            />
          </label>
          <button>Publish approved prices</button>
          <p>No default or draft price is published before approval.</p>
        </form>
      )}
      {section === "pricing" && admin && (
        <>
          <form
            className="cp-card"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              void save(
                `/accounts/${encodeURIComponent(String(f.customerUid))}/pricing`,
                {
                  productPrices: Object.fromEntries(
                    catalog.map((p) => [
                      p.id,
                      Math.round(Number(f[p.id]) * 100),
                    ]),
                  ),
                },
              );
            }}
          >
            <h3>Customer contract prices</h3>
            <label>
              Registered customer UID
              <input name="customerUid" required />
            </label>
            {catalog.map((p) => (
              <label key={p.id}>
                {p.name} — USD per 24-pouch box
                <input
                  name={p.id}
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                />
              </label>
            ))}
            <button>Save approved contract prices</button>
          </form>
          <form
            className="cp-card"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              void save(`/inventory/${String(f.productId)}/tiers`, {
                tiers: [
                  {
                    minimumBoxes: Number(f.minimumBoxes),
                    priceCents: Math.round(Number(f.priceUSD) * 100),
                  },
                ],
              });
            }}
          >
            <h3>Quantity price tier</h3>
            <label>
              Product
              <select name="productId">
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minimum boxes
              <input name="minimumBoxes" required type="number" min="2" />
            </label>
            <label>
              USD per box
              <input
                name="priceUSD"
                required
                type="number"
                min="0.01"
                step="0.01"
              />
            </label>
            <button>Save quantity tier</button>
            <p>
              Replaces the product’s quantity tiers. Contract prices take
              precedence.
            </p>
          </form>
        </>
      )}
      {schema && permitted && (
        <form
          className="cp-card"
          onSubmit={(e) => {
            e.preventDefault();
            const body: any = Object.fromEntries(new FormData(e.currentTarget));
            for (const key of numberFields)
              if (key in body) body[key] = Number(body[key]);
            if ("amountUSD" in body) {
              body.amountCents = Math.round(body.amountUSD * 100);
              delete body.amountUSD;
            }
            void save(
              "/" + (section === "notes" ? "executive-notes" : section),
              body,
            );
          }}
        >
          {schema.map((name) => (
            <label key={name}>
              {labels[name] || name.replace(/([A-Z])/g, " $1")}
              {name === "productId" ? (
                <select name={name} required>
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : name === "kind" ? (
                <select name={name}>
                  {[
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
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              ) : name === "outcome" ? (
                <select name={name}>
                  {["Follow-up", "Trial", "Signed", "Rejected"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              ) : ["body", "notes", "note"].includes(name) ? (
                <textarea name={name} required={name === "body"} />
              ) : (
                <input
                  name={name}
                  defaultValue={
                    new URLSearchParams(location.search).get(name) || undefined
                  }
                  type={numberFields.includes(name) ? "number" : "text"}
                  step="any"
                  required={
                    ![
                      "equipmentId",
                      "followUpAt",
                      "dueAt",
                      "source",
                      "status",
                      "note",
                    ].includes(name)
                  }
                />
              )}
            </label>
          ))}
          <button>Save record</button>
        </form>
      )}
      {section === "attendance" && role !== "customer" && (
        <>
          <p>
            Connect to the premises network and allow camera and precise
            location. Time is recorded by the server.
          </p>
          <div className="cp-actions">
            <button onClick={() => void run(() => punch("in"), "SIGNED IN")}>
              Sign in to shift
            </button>
            <button onClick={() => void run(() => punch("out"), "SIGNED OUT")}>
              Sign out of shift
            </button>
          </div>
          {admin && (
            <>
              <details className="cp-card">
                <summary>Configure authorised premises</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const b: any = Object.fromEntries(
                      new FormData(e.currentTarget),
                    );
                    b.radiusMetres = Number(b.radiusMetres);
                    void save("/attendance/config", b);
                  }}
                >
                  {[
                    "latitude",
                    "longitude",
                    "radiusMetres",
                    "allowedIPs",
                    "timezone",
                  ].map((k) => (
                    <label key={k}>
                      {k}
                      <input
                        name={k}
                        required
                        defaultValue={
                          k === "timezone"
                            ? "Africa/Mogadishu"
                            : k === "radiusMetres"
                              ? 100
                              : undefined
                        }
                      />
                    </label>
                  ))}
                  <button>Save premises</button>
                </form>
              </details>
              <details className="cp-card">
                <summary>Assign shift</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(
                      "/attendance/shift",
                      Object.fromEntries(new FormData(e.currentTarget)),
                    );
                  }}
                >
                  {["uid", "day", "start", "end"].map((k) => (
                    <label key={k}>
                      {k}
                      <input
                        name={k}
                        required
                        placeholder={k === "day" ? "YYYY-MM-DD" : undefined}
                      />
                    </label>
                  ))}
                  <button>Save shift</button>
                </form>
              </details>
            </>
          )}
        </>
      )}
      {section === "routes" && (
        <>
          <form
            className="cp-card"
            onSubmit={(e) => {
              e.preventDefault();
              const b: any = Object.fromEntries(new FormData(e.currentTarget));
              void run(async () => {
                const result = await api("/routes/plan", {
                  driverUid: b.driverUid,
                  origin: {
                    latitude: Number(b.latitude),
                    longitude: Number(b.longitude),
                  },
                });
                setRoute(result);
              }, "Route planned.");
            }}
          >
            {role !== "driver" && (
              <label>
                Driver UID
                <input name="driverUid" required />
              </label>
            )}
            <label>
              Starting latitude
              <input name="latitude" required type="number" step="any" />
            </label>
            <label>
              Starting longitude
              <input name="longitude" required type="number" step="any" />
            </label>
            <button>Plan assigned deliveries</button>
          </form>
          {route && (
            <div className="cp-card">
              <p>
                {route.method}. Sequence uses a routing heuristic; it is not a
                guarantee of the shortest possible journey. Check delivery
                windows.
              </p>
              <ol>
                {route.sequence.map((s: any) => (
                  <li key={s.orderId}>
                    <a href={`${base}/orders/${s.orderId}`}>
                      {s.address} · {(s.legMetres / 1000).toFixed(1)} km
                    </a>
                  </li>
                ))}
              </ol>
              <RoutePlot
                points={route.sequence.map((s: any) => s.destination)}
              />
            </div>
          )}
        </>
      )}
      {section === "fleet" && (
        <>
          <RoutePlot
            points={orders
              .filter(
                (o) =>
                  o.location && !["Delivered", "Cancelled"].includes(o.status),
              )
              .map((o) => o.location)}
          />
          {orders
            .filter((o) => o.location)
            .map((o) => (
              <article className="cp-card" key={o.id}>
                <a href={`${base}/orders/${o.id}/tracking`}>
                  {o.driverName || o.driverUid} · {o.id}
                </a>
                <p>
                  Last seen: {o.location.at} · ETA:{" "}
                  {o.eta || "Awaiting destination coordinates"}
                </p>
              </article>
            ))}
        </>
      )}
      {data?.[collection] && (
        <>
          <button
            onClick={() =>
              csvDownload("horn-harvest-" + collection, data[collection])
            }
          >
            Export CSV
          </button>
          {!data[collection].length && <p>No records yet.</p>}
          {data[collection].map((item: any) => (
            <article className="cp-card" key={item.id}>
              <h3>{item.title || item.message || item.lot || item.id}</h3>
              <dl>
                {Object.entries(item)
                  .filter(([k]) => !["photoPath", "roles"].includes(k))
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd style={{ overflowWrap: "anywhere" }}>
                        {typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v ?? "")}
                      </dd>
                    </div>
                  ))}
              </dl>
              {section === "intakes" && wh && (
                <a
                  href={`${base}/batches?intakeId=${encodeURIComponent(item.id)}`}
                >
                  Start production from this intake
                </a>
              )}
              {section === "attendance" && item.action !== "absent" && (
                <button
                  onClick={() =>
                    void run(async () => {
                      const url = item.photoDataUrl || item.photoUrl;
                      if (!url)
                        throw Error(
                          "No attendance photo stored on this record.",
                        );
                      if (photoPreview) URL.revokeObjectURL(photoPreview);
                      setPhotoPreview(String(url));
                    })
                  }
                >
                  View recorded photo
                </button>
              )}
              {section === "alerts" &&
                wh &&
                item.active &&
                !item.acknowledgedBy && (
                  <button
                    onClick={() =>
                      void save(`/alerts/${item.id}/acknowledge`, {})
                    }
                  >
                    Acknowledge alert
                  </button>
                )}
              {section === "batches" && wh && item.status !== "Released" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const b = Object.fromEntries(new FormData(e.currentTarget));
                    void save(`/batches/${item.id}/advance`, {
                      finishedBoxes: Number(b.finishedBoxes),
                      wasteKg: Number(b.wasteKg),
                    });
                  }}
                >
                  {item.steps.length === 8 && (
                    <>
                      <label>
                        Finished boxes
                        <input
                          name="finishedBoxes"
                          type="number"
                          required
                          min="1"
                        />
                      </label>
                      <label>
                        Waste kg
                        <input
                          name="wasteKg"
                          type="number"
                          step="any"
                          required
                          min="0"
                        />
                      </label>
                    </>
                  )}
                  <button>Complete {productionSteps[item.steps.length]}</button>
                </form>
              )}
              {section === "trials" && sell && item.status === "Issued" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const b: any = Object.fromEntries(
                      new FormData(e.currentTarget),
                    );
                    Object.keys(b).forEach((k) => (b[k] = Number(b[k])));
                    void save(`/trials/${item.id}/reconcile`, b);
                  }}
                >
                  {["soldBoxes", "returnedBoxes", "wasteBoxes"].map((k) => (
                    <label key={k}>
                      {k}
                      <input name={k} type="number" min="0" required />
                    </label>
                  ))}
                  <button>Reconcile trial</button>
                </form>
              )}
              {section === "notes" && admin && item.status !== "Closed" && (
                <button
                  onClick={() =>
                    void save("/executive-notes", { ...item, status: "Closed" })
                  }
                >
                  Close record
                </button>
              )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
