import React, { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../firebase";
import { portalApi, getOrderProofDataUrl } from "../portalClient";
import logo from "../assets/images/official-logo-transparent.png";
import { exportOrderInvoice } from "../orderInvoicePdf";
import "./connected-portal.css";
import OperationalModules, { DeliveryHistory } from "./OperationalModules";
import { useDeliveryTracker } from "./useDeliveryTracker";
const money = (n: number) => `$${((n || 0) / 100).toFixed(2)}`;
export { portalApi };
type Prospect = {
  id: string;
  company: string;
  contactName: string;
  phone: string;
  stage: string;
  notes: string;
};
const stages = [
  "Confirmed",
  "Preparing",
  "Ready for collection",
  "Left warehouse",
  "Arrived",
  "Delivered",
];
type Line = {
  productId: string;
  productName: string;
  boxes: number;
  unitPriceCents: number;
  amountCents: number;
};
type RecordOrder = {
  id: string;
  customerUid: string;
  customerName: string;
  company: string;
  address: string;
  lines: Line[];
  totalCents: number;
  paidCents: number;
  onCredit: boolean;
  status: string;
  createdAt: string;
  driverUid?: string;
  driverName?: string;
  windowStart?: string;
  windowEnd?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  recipient?: string;
  events: { status: string; at: string }[];
  notifications: { message: string; at: string }[];
  eta?: string;
  etaMethod?: string;
  destination?: { latitude: number; longitude: number };
  deliveryIssue?: string;
  location?: { latitude: number; longitude: number; at: string };
};
type Stock = {
  productId: string;
  onHandBoxes: number;
  reservedBoxes: number;
  priceCents: number;
  threshold: number;
  tiers?: { minimumBoxes: number; priceCents: number }[];
};
type Account = {
  uid: string;
  contactName: string;
  company: string;
  balanceCents: number;
  creditLimitCents: number;
  address?: string;
  phone?: string;
  productPrices?: Record<string, number>;
};
type Workspace = {
  role: string;
  uid: string;
  catalog: { id: string; name: string }[];
  account: Account;
  orders: RecordOrder[];
  inventory: Stock[];
  accounts: Account[];
  payments: {
    id: string;
    customerUid: string;
    amountCents: number;
    reference: string;
    at: string;
    orderId?: string;
  }[];
  equipment: {
    id: string;
    name: string;
    quantity: number;
    holderUid?: string;
    ownership: string;
  }[];
};
function values(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form));
}
function Field({
  label,
  name,
  type = "text",
  value,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        min={type === "number" ? 0 : undefined}
      />
    </label>
  );
}
export default function ConnectedPortal() {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true),
    [data, setData] = useState<Workspace | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [register, setRegister] = useState(false),
    [path, setPath] = useState(location.pathname),
    [basket, setBasket] = useState<Record<string, number>>({}),
    [orderCustomer, setOrderCustomer] = useState(""),
    [requestKey, setRequestKey] = useState(crypto.randomUUID());
  const [drivers, setDrivers] = useState<{ uid: string; name: string }[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const go = (p: string) => {
    history.pushState(null, "", p);
    setPath(p);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    const handler = () => setPath(location.pathname);
    window.addEventListener("popstate", handler);
    const stop = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
      setData(null);
      setProspects([]);
      setDrivers([]);
      setBasket({});
      setNotice("");
    });
    return () => {
      stop();
      window.removeEventListener("popstate", handler);
    };
  }, []);
  const refresh = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const next = await portalApi("/workspace");
      if (auth.currentUser?.uid !== uid) return;
      const [directory, prospectRows] = await Promise.all([
        ["warehouse", "admin", "ceo"].includes(next.role)
          ? portalApi("/drivers")
          : Promise.resolve({ drivers: [] }),
        ["admin", "ceo", "sales"].includes(next.role)
          ? portalApi("/prospects")
          : Promise.resolve({ prospects: [] }),
      ]);
      if (auth.currentUser?.uid !== uid) return;
      setData(next);
      setDrivers(directory.drivers);
      setProspects(prospectRows.prospects);
      setError("");
    } catch (e) {
      if (auth.currentUser?.uid === uid) setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (!user) return;
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [user, refresh]);
  const run = async (fn: () => Promise<unknown>, success = "Saved.") => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await refresh();
      setNotice(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = values(e.currentTarget);
    await run(
      async () => {
        if (register) {
          await createUserWithEmailAndPassword(
            auth,
            String(f.email),
            String(f.password),
          );
          await portalApi("/account", {
            contactName: f.contactName,
            company: f.company,
            address: f.address,
            phone: f.phone,
          });
        } else
          await signInWithEmailAndPassword(
            auth,
            String(f.email),
            String(f.password),
          );
      },
      register ? "Account created." : "Signed in.",
    );
  };
  const suffix = path
      .replace(/^\/(customer|warehouse|driver|sales|ceo|operations|admin)/, "")
      .split("/")
      .filter(Boolean),
    section = suffix[0] || "overview",
    order =
      suffix[0] === "orders"
        ? data?.orders.find((o) => o.id === suffix[1])
        : undefined;
  const customer = data?.role === "customer",
    driver = data?.role === "driver",
    owner = ["admin", "ceo"].includes(data?.role || ""),
    staff = ["warehouse", "sales", "admin", "ceo"].includes(data?.role || ""),
    base = customer
      ? "/customer"
      : driver
        ? "/driver"
        : data?.role === "ceo"
          ? "/ceo"
          : "/operations";
  const rows = data?.orders || [];
  const tracker = useDeliveryTracker(
    driver ? order?.id : undefined,
    order?.status,
    portalApi,
  );
  const downloadInvoice = async (o: RecordOrder) =>
    run(
      () =>
        exportOrderInvoice(
          o,
          (data?.payments || [])
            .filter((p) => p.orderId === o.id)
            .map((p) => p.reference),
        ),
      "Invoice downloaded.",
    );
  const orderLinks = (o: RecordOrder) => (
    <div className="cp-actions">
      <a
        href={`${base}/orders/${o.id}`}
        onClick={(e) => {
          e.preventDefault();
          go(`${base}/orders/${o.id}`);
        }}
      >
        View order
      </a>
      <a
        href={`${base}/orders/${o.id}/tracking`}
        onClick={(e) => {
          e.preventDefault();
          go(`${base}/orders/${o.id}/tracking`);
        }}
      >
        Track Delivery
      </a>
      {o.status === "Delivered" && (
        <a
          href={`${base}/orders/${o.id}/invoice`}
          onClick={(e) => {
            e.preventDefault();
            go(`${base}/orders/${o.id}/invoice`);
          }}
        >
          Invoice
        </a>
      )}
      {customer && (
        <button
          disabled={busy}
          onClick={() => {
            setBasket(
              Object.fromEntries(o.lines.map((l) => [l.productId, l.boxes])),
            );
            setRequestKey(crypto.randomUUID());
            go("/customer/new-order");
          }}
        >
          Reorder
        </button>
      )}
    </div>
  );
  return (
    <div className="cp">
      <header className="cp-header">
        <a href="/">
          <img src={logo} alt="Horn & Harvest" />
        </a>
        <div>
          <a href="/">Return to website</a>
          {user && (
            <button
              onClick={() => void run(() => signOut(auth), "Signed out.")}
            >
              Sign out
            </button>
          )}
        </div>
      </header>
      <main>
        <p className="eyebrow">Horn & Harvest</p>
        <h1>
          {customer
            ? "Your account"
            : driver
              ? "Your deliveries"
              : data
                ? "Operations"
                : "Secure account access"}
        </h1>
        {error && (
          <div className="cp-message" role="alert">
            {error}
            <button onClick={() => void refresh()}>Retry connection</button>
          </div>
        )}
        {notice && (
          <p className="cp-message" role="status">
            {notice}
          </p>
        )}
        {checking ? (
          <p>Checking your session…</p>
        ) : !user ? (
          <section className="cp-card">
            <h2>{register ? "Create a customer account" : "Sign in"}</h2>
            <form onSubmit={login}>
              <Field name="email" label="Email" type="email" />
              <Field name="password" label="Password" type="password" />
              {register && (
                <>
                  <Field name="contactName" label="Full name" />
                  <Field name="company" label="Business or customer name" />
                  <Field name="address" label="Delivery address" />
                  <Field name="phone" label="Telephone" />
                </>
              )}
              <button disabled={busy}>
                {busy
                  ? "Please wait…"
                  : register
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>
            <button onClick={() => setRegister(!register)}>
              {register
                ? "Already registered? Sign in"
                : "New customer? Register"}
            </button>
          </section>
        ) : !data ? (
          <p>Connecting to your secure records…</p>
        ) : (
          <>
            <nav className="cp-nav" aria-label="Account navigation">
              {(data.role === "staff"
                ? [["attendance", "Staff attendance"]]
                : data.role === "ceo"
                  ? [
                      ["overview", "Today’s Work"],
                      ["prospects", "Prospect Hub"],
                      ["account", "Business Snapshot"],
                      ["market", "Market Intelligence"],
                      ["reference", "Reference Library"],
                    ]
                  : [
                      ["overview", "Overview"],
                      ["orders", "Orders"],
                      ...(customer || ["sales", "admin"].includes(data.role)
                        ? [["new-order", "Place order"]]
                        : []),
                      ["account", "Account & payments"],
                      ...(["sales", "admin"].includes(data.role)
                        ? [["prospects", "Prospect Hub"]]
                        : []),
                      ...(!customer
                        ? [["attendance", "Staff attendance"]]
                        : []),
                      ...(driver ? [["routes", "Delivery route"]] : []),
                      ...(staff
                        ? [
                            ["alerts", "Alerts"],
                            ["fleet", "Live drivers"],
                            ["intakes", "Fruit intake"],
                            ["batches", "Production"],
                            ["forecasts", "Supply planning"],
                          ]
                        : []),
                      ...(["sales", "admin"].includes(data.role)
                        ? [
                            ["visits", "Field visits"],
                            ["trials", "Trial stock"],
                          ]
                        : []),
                      ...(staff
                        ? [
                            ["stock", "Warehouse stock"],
                            ["equipment", "Equipment"],
                          ]
                        : customer
                          ? [["equipment", "Assigned equipment"]]
                          : []),
                    ]
              )
                .concat(
                  data.role === "admin"
                    ? [
                        ["staff", "Staff accounts"],
                        ["pricing", "Approved pricing"],
                      ]
                    : [],
                )
                .map(([key, label]) => (
                  <a
                    key={key}
                    aria-current={section === key ? "page" : undefined}
                    href={`${base}/${key}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(`${base}/${key}`);
                    }}
                  >
                    {label}
                  </a>
                ))}
            </nav>
            {data.role === "ceo" && (
              <div className="cp-actions" aria-label="Executive folder tools">
                {(section === "overview"
                  ? [
                      ["alerts", "Exceptions"],
                      ["notes", "Priorities & decisions"],
                      ["attendance", "Attendance"],
                    ]
                  : section === "prospects"
                    ? [
                        ["visits", "Visits"],
                        ["trials", "Trials"],
                      ]
                    : section === "account"
                      ? [
                          ["orders", "Orders"],
                          ["stock", "Stock"],
                          ["intakes", "Intake"],
                          ["batches", "Production"],
                          ["fleet", "Drivers"],
                          ["expenses", "Costs"],
                          ["pricing", "Approved pricing"],
                        ]
                      : section === "market"
                        ? [
                            ["forecasts", "Supply forecast"],
                            ["notes", "Recorded research"],
                          ]
                        : [
                            ["notes", "Strategy, meetings & reference"],
                            ["staff", "Staff accounts"],
                          ]
                ).map(([key, label]) => (
                  <a key={key} href={`${base}/${key}`}>
                    {label}
                  </a>
                ))}
              </div>
            )}
            {[
              "alerts",
              "attendance",
              "routes",
              "fleet",
              "intakes",
              "batches",
              "forecasts",
              "visits",
              "trials",
              "notes",
              "expenses",
              "staff",
              "pricing",
            ].includes(section) && (
              <OperationalModules
                section={section}
                api={portalApi}
                run={run}
                role={data.role}
                orders={rows}
                catalog={data.catalog}
                base={base}
              />
            )}
            {section === "overview" && (
              <>
                <div className="cp-grid">
                  <article className="cp-card">
                    <h2>Orders</h2>
                    <strong>{rows.length}</strong>
                    <p>
                      {rows.filter((o) => o.status !== "Delivered").length}{" "}
                      active
                    </p>
                  </article>
                  <article className="cp-card">
                    <h2>
                      {customer ? "Account balance" : "Outstanding orders"}
                    </h2>
                    <strong>
                      {money(
                        customer
                          ? Math.max(0, data.account.balanceCents)
                          : rows.reduce(
                              (s, o) =>
                                s + Math.max(0, o.totalCents - o.paidCents),
                              0,
                            ),
                      )}
                    </strong>
                    {customer && (
                      <p>
                        Account credit:{" "}
                        {money(Math.max(0, -data.account.balanceCents))}
                      </p>
                    )}
                  </article>
                  <article className="cp-card">
                    <h2>
                      {customer ? "Approved credit limit" : "Available stock"}
                    </h2>
                    <strong>
                      {customer
                        ? money(data.account.creditLimitCents)
                        : data.inventory.reduce(
                            (s, i) => s + i.onHandBoxes - i.reservedBoxes,
                            0,
                          ) + " boxes"}
                    </strong>
                  </article>
                </div>
                {staff &&
                  data.inventory
                    .filter(
                      (i) => i.onHandBoxes - i.reservedBoxes <= i.threshold,
                    )
                    .map((i) => (
                      <p role="status" className="cp-message" key={i.productId}>
                        Low stock:{" "}
                        {data.catalog.find((p) => p.id === i.productId)?.name} —{" "}
                        {i.onHandBoxes - i.reservedBoxes} boxes available.
                      </p>
                    ))}
                <h2>Recent orders</h2>
                {rows.slice(0, 5).map((o) => (
                  <article className="cp-card" key={o.id}>
                    <h3>
                      {o.company || o.customerName} · {o.id}
                    </h3>
                    <p>
                      {o.status} · {money(o.totalCents)}
                    </p>
                    {orderLinks(o)}
                  </article>
                ))}
                {!rows.length && <p>No orders have been recorded yet.</p>}
                {rows.flatMap((o) =>
                  o.notifications.map((n, i) => (
                    <p className="cp-message" key={o.id + i}>
                      {n.message} · {o.id} · {new Date(n.at).toLocaleString()}
                    </p>
                  )),
                )}
              </>
            )}
            {section === "new-order" &&
              (customer || owner || data.role === "sales") && (
                <section className="cp-card">
                  <h2>Place an order</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = values(e.currentTarget);
                      void run(async () => {
                        const result = await portalApi("/orders", {
                          customerUid: f.customerUid,
                          requestKey,
                          items: Object.entries(
                            basket as Record<string, number>,
                          )
                            .filter(([, n]) => n > 0)
                            .map(([productId, boxes]) => ({
                              productId,
                              boxes,
                            })),
                          address: f.address,
                          onCredit: f.onCredit === "on",
                        });
                        setBasket({});
                        setRequestKey(crypto.randomUUID());
                        go(`${base}/orders/${result.order.id}`);
                      }, "Order saved and stock reserved.");
                    }}
                  >
                    {data.catalog.map((p) => {
                      const s = data.inventory.find(
                        (i) => i.productId === p.id,
                      );
                      const a = customer
                        ? data.account
                        : data.accounts.find((a) => a.uid === orderCustomer);
                      const qty = basket[p.id] || 0;
                      const unit =
                        a?.productPrices?.[p.id] ||
                        s?.tiers
                          ?.filter((t) => qty >= t.minimumBoxes)
                          .sort((a, b) => b.minimumBoxes - a.minimumBoxes)[0]
                          ?.priceCents ||
                        s?.priceCents ||
                        0;
                      return (
                        <label key={p.id}>
                          {p.name}
                          <span>
                            {s
                              ? `${money(unit)} / 24-pouch box · ${s.onHandBoxes - s.reservedBoxes} available`
                              : "Price and stock not configured"}
                          </span>
                          <input
                            aria-label={`${p.name} boxes`}
                            type="number"
                            min="0"
                            max="10000"
                            value={basket[p.id] || 0}
                            onChange={(e) =>
                              setBasket({
                                ...basket,
                                [p.id]: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      );
                    })}
                    {!customer && (
                      <label>
                        Registered customer
                        <select
                          name="customerUid"
                          required
                          value={orderCustomer}
                          onChange={(e) => setOrderCustomer(e.target.value)}
                        >
                          <option value="">Select customer</option>
                          {data.accounts.map((a) => (
                            <option key={a.uid} value={a.uid}>
                              {a.company || a.contactName} · {a.uid}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <Field
                      label="Delivery address"
                      name="address"
                      value={data.account.address}
                    />
                    <label>
                      <input type="checkbox" name="onCredit" /> Use approved
                      account credit
                    </label>
                    <p>
                      Total:{" "}
                      {money(
                        Object.entries(basket as Record<string, number>).reduce(
                          (s, [id, n]) =>
                            s +
                            n *
                              ((customer
                                ? data.account
                                : data.accounts.find(
                                    (a) => a.uid === orderCustomer,
                                  )
                              )?.productPrices?.[id] ||
                                data.inventory
                                  .find((i) => i.productId === id)
                                  ?.tiers?.filter((t) => n >= t.minimumBoxes)
                                  .sort(
                                    (a, b) => b.minimumBoxes - a.minimumBoxes,
                                  )[0]?.priceCents ||
                                data.inventory.find((i) => i.productId === id)
                                  ?.priceCents ||
                                0),
                          0,
                        ),
                      )}
                    </p>
                    <button
                      disabled={
                        busy ||
                        !Object.values(basket as Record<string, number>).some(
                          (n) => n > 0,
                        )
                      }
                    >
                      Confirm order
                    </button>
                  </form>
                </section>
              )}
            {section === "orders" && !suffix[1] && (
              <>
                <h2>Order history</h2>
                {rows.map((o) => (
                  <article className="cp-card" key={o.id}>
                    <h3>{o.id}</h3>
                    <p>
                      {o.company || o.customerName} · {o.status} ·{" "}
                      {money(o.totalCents)} · Unpaid{" "}
                      {money(o.totalCents - o.paidCents)}
                    </p>
                    {orderLinks(o)}
                  </article>
                ))}
                {!rows.length && <p>No orders yet.</p>}
              </>
            )}
            {section === "orders" && suffix[1] && !order && (
              <p>
                Order not found or not available to this account.{" "}
                <a href={`${base}/orders`}>Return to orders</a>
              </p>
            )}
            {order && (
              <>
                <section className="cp-card">
                  <h2>
                    {suffix[2] === "invoice"
                      ? "Invoice"
                      : suffix[2] === "tracking"
                        ? "Track My Delivery"
                        : "Order details"}
                  </h2>
                  <p>Order reference: {order.id}</p>
                  <p>
                    Date placed: {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <p>
                    {order.company} · {order.address}
                  </p>
                  <div className="cp-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Boxes</th>
                          <th>Unit price</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.lines.map((l) => (
                          <tr key={l.productId}>
                            <td data-label="Product">{l.productName}</td>
                            <td data-label="Boxes">{l.boxes}</td>
                            <td data-label="Unit price">
                              {money(l.unitPriceCents)}
                            </td>
                            <td data-label="Amount">{money(l.amountCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p>
                    Total {money(order.totalCents)} · Paid{" "}
                    {money(order.paidCents)} · Outstanding{" "}
                    {money(order.totalCents - order.paidCents)}
                  </p>
                  {orderLinks(order)}
                  {customer &&
                    order.paidCents < order.totalCents &&
                    order.status !== "Cancelled" && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = values(e.currentTarget);
                          void run(async () => {
                            const d = await portalApi(
                              `/orders/${order.id}/checkout`,
                              { phone: f.phone, requestKey: requestKey },
                            );
                            location.assign(d.paymentUrl);
                          });
                        }}
                      >
                        <Field
                          label="Payment wallet number"
                          name="phone"
                          value={data.account.phone}
                        />
                        <button disabled={busy}>Pay order securely</button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                portalApi(
                                  `/orders/${order.id}/reconcile-payment`,
                                  {},
                                ),
                              "Payment status checked.",
                            )
                          }
                        >
                          Check payment status
                        </button>
                      </form>
                    )}
                  {["Confirmed", "Preparing", "Ready for collection"].includes(
                    order.status,
                  ) &&
                    (customer || staff) && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Cancel this order? Paid amounts become account credit.",
                            )
                          )
                            void run(
                              () => portalApi(`/orders/${order.id}/cancel`, {}),
                              "Order cancelled.",
                            );
                        }}
                      >
                        Cancel order
                      </button>
                    )}
                  {customer && order.paidCents < order.totalCents && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            portalApi(`/orders/${order.id}/apply-credit`, {}),
                          "Account credit allocated.",
                        )
                      }
                    >
                      Apply available account credit
                    </button>
                  )}
                </section>
                {suffix[2] === "invoice" ? (
                  order.status === "Delivered" ? (
                    <section className="cp-card">
                      <button
                        disabled={busy}
                        onClick={() => void downloadInvoice(order)}
                      >
                        Download PDF
                      </button>
                      <article className="invoice-sheet">
                        <header className="invoice-header">
                          <img src={logo} alt="Horn & Harvest" />
                          <div>
                            <h2>Invoice</h2>
                          </div>
                        </header>
                        <section className="invoice-meta">
                          <div>
                            <span>Invoice number</span>
                            <strong>{order.invoiceNumber}</strong>
                          </div>
                          <div>
                            <span>Invoice date</span>
                            <strong>{order.invoiceDate?.slice(0, 10)}</strong>
                          </div>
                          <div>
                            <span>Order reference</span>
                            <strong>{order.id}</strong>
                          </div>
                        </section>
                        <section className="invoice-parties">
                          <div>
                            <h3>From</h3>
                            <strong>HORN & HARVEST</strong>
                            <p>
                              Mogadishu, Somalia
                              <br />
                              info@hornandharvest.com
                            </p>
                          </div>
                          <div>
                            <h3>Bill to</h3>
                            <strong>{order.company}</strong>
                            <p>
                              {order.customerName}
                              <br />
                              {order.address}
                            </p>
                          </div>
                        </section>
                        <div className="invoice-table-wrap">
                          <table className="invoice-table">
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Unit price</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.lines.map((l) => (
                                <tr key={l.productId}>
                                  <td data-label="Product">{l.productName}</td>
                                  <td data-label="Quantity">
                                    {l.boxes} boxes (24 pouches each)
                                  </td>
                                  <td data-label="Unit price">
                                    {money(l.unitPriceCents)}
                                  </td>
                                  <td data-label="Amount">
                                    {money(l.amountCents)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <section className="invoice-summary">
                          <div>
                            <span>Subtotal</span>
                            <strong>
                              {money(
                                order.lines.reduce(
                                  (n, l) => n + l.amountCents,
                                  0,
                                ),
                              )}
                            </strong>
                          </div>
                          <div className="invoice-total">
                            <span>Total</span>
                            <strong>{money(order.totalCents)}</strong>
                          </div>
                          <div>
                            <span>Paid</span>
                            <strong>{money(order.paidCents)}</strong>
                          </div>
                          <div>
                            <span>Outstanding</span>
                            <strong>
                              {money(
                                Math.max(0, order.totalCents - order.paidCents),
                              )}
                            </strong>
                          </div>
                        </section>
                        <section className="invoice-payment">
                          <div>
                            <span>Payment status</span>
                            <strong>
                              {order.paidCents >= order.totalCents
                                ? "Paid"
                                : "Outstanding balance"}
                            </strong>
                          </div>
                          <div>
                            <span>Payment reference</span>
                            <strong>
                              {data.payments
                                .filter((p) => p.orderId === order.id)
                                .map((p) => p.reference)
                                .join("; ") || "No allocated receipt"}
                            </strong>
                          </div>
                        </section>
                        <footer className="invoice-footer">
                          <strong>Dhadhanka Awoowayaasheen</strong>
                          <span>The Taste of Our Ancestors</span>
                        </footer>
                      </article>
                    </section>
                  ) : (
                    <p>Invoice becomes available after delivery.</p>
                  )
                ) : (
                  <section className="cp-card">
                    <h2>Delivery timeline</h2>
                    {staff && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = values(e.currentTarget);
                          void run(
                            () =>
                              portalApi(`/orders/${order.id}/destination`, {
                                latitude: Number(f.latitude),
                                longitude: Number(f.longitude),
                              }),
                            "Destination saved.",
                          );
                        }}
                      >
                        <Field
                          name="latitude"
                          label="Destination latitude"
                          value={order.destination?.latitude}
                        />
                        <Field
                          name="longitude"
                          label="Destination longitude"
                          value={order.destination?.longitude}
                        />
                        <button disabled={busy}>
                          Save destination coordinates
                        </button>
                      </form>
                    )}
                    {driver &&
                      ["Left warehouse", "Arrived"].includes(order.status) && (
                        <>
                          <button
                            onClick={
                              tracker.active ? tracker.stop : tracker.start
                            }
                          >
                            {tracker.active
                              ? "STOP DELIVERY TRACKING"
                              : "START DELIVERY TRACKING"}
                          </button>
                          <p role="status">{tracker.message}</p>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = values(e.currentTarget);
                              void run(
                                () =>
                                  portalApi(`/orders/${order.id}/issue`, {
                                    reason: f.reason,
                                  }),
                                "Delivery issue reported.",
                              );
                            }}
                          >
                            <Field name="reason" label="Delivery issue" />
                            <button>Report issue to warehouse</button>
                          </form>
                        </>
                      )}
                    {order.deliveryIssue && (
                      <p role="alert">Delivery issue: {order.deliveryIssue}</p>
                    )}
                    <DeliveryHistory orderId={order.id} api={portalApi} />

                    <ol className="cp-timeline">
                      {stages.map((s) => {
                        const event = order.events.find((e) => e.status === s);
                        return (
                          <li key={s}>
                            <strong>{s}</strong>
                            <span>
                              {event
                                ? new Date(event.at).toLocaleString()
                                : "Pending"}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                    <p>Driver: {order.driverName || "Not assigned yet"}</p>
                    <p>
                      Delivery window:{" "}
                      {order.windowStart
                        ? `${new Date(order.windowStart).toLocaleString()} – ${new Date(order.windowEnd!).toLocaleTimeString()}`
                        : "To be confirmed"}
                    </p>
                    <p>
                      Estimated arrival:{" "}
                      {order.eta
                        ? `${new Date(order.eta).toLocaleString()} (${order.etaMethod})`
                        : "Awaiting scheduled destination and GPS."}
                    </p>
                    {order.location && (
                      <p>
                        Last seen {new Date(order.location.at).toLocaleString()}{" "}
                        ·{" "}
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${order.location.latitude}&mlon=${order.location.longitude}#map=16/${order.location.latitude}/${order.location.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View driver location
                        </a>
                      </p>
                    )}
                    {order.status === "Delivered" && (
                      <>
                        <p>Received by: {order.recipient}</p>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const dataUrl = await getOrderProofDataUrl(
                                order.id,
                              );
                              if (!dataUrl)
                                throw Error(
                                  "Delivery photo could not be loaded.",
                                );
                              const a = document.createElement("a");
                              a.href = dataUrl;
                              a.download = `delivery-${order.id}.jpg`;
                              a.click();
                            }, "Delivery proof downloaded.")
                          }
                        >
                          Download delivery photo
                        </button>
                      </>
                    )}
                    {staff &&
                      ![
                        "Left warehouse",
                        "Arrived",
                        "Delivered",
                        "Cancelled",
                      ].includes(order.status) && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = values(e.currentTarget);
                            void run(
                              () =>
                                portalApi(`/orders/${order.id}/assign`, {
                                  ...f,
                                  windowStart: new Date(
                                    String(f.windowStart),
                                  ).toISOString(),
                                  windowEnd: new Date(
                                    String(f.windowEnd),
                                  ).toISOString(),
                                }),
                              "Driver and delivery window saved.",
                            );
                          }}
                        >
                          <h3>Assign delivery</h3>
                          <label>
                            Driver
                            <select
                              name="driverUid"
                              required
                              defaultValue={order.driverUid || ""}
                            >
                              <option value="">
                                Choose an authorised driver
                              </option>
                              {drivers.map((d) => (
                                <option key={d.uid} value={d.uid}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Field
                            label="Window starts"
                            name="windowStart"
                            type="datetime-local"
                          />
                          <Field
                            label="Window ends"
                            name="windowEnd"
                            type="datetime-local"
                          />
                          <button disabled={busy}>Save assignment</button>
                        </form>
                      )}
                    {(((owner || data.role === "warehouse") &&
                      ["Confirmed", "Preparing"].includes(order.status)) ||
                      ((driver || owner) &&
                        [
                          "Ready for collection",
                          "Left warehouse",
                          "Arrived",
                        ].includes(order.status))) && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget,
                            f = values(form);
                          void run(async () => {
                            let photo;
                            if (order.status === "Arrived") {
                              const file = (
                                form.elements.namedItem(
                                  "photo",
                                ) as HTMLInputElement
                              ).files?.[0];
                              if (!file)
                                throw Error("Select a delivery photo.");
                              photo = await new Promise<string>(
                                (resolve, reject) => {
                                  const r = new FileReader();
                                  r.onload = () => resolve(String(r.result));
                                  r.onerror = reject;
                                  r.readAsDataURL(file);
                                },
                              );
                            }
                            await portalApi(`/orders/${order.id}/status`, {
                              status: stages[stages.indexOf(order.status) + 1],
                              recipient: f.recipient,
                              photo,
                            });
                          }, "Delivery stage saved.");
                        }}
                      >
                        <h3>Next stage</h3>
                        {order.status === "Arrived" && (
                          <>
                            <Field
                              label="Receiver full name"
                              name="recipient"
                            />
                            <label>
                              Delivery photo
                              <input
                                type="file"
                                name="photo"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                required
                              />
                            </label>
                          </>
                        )}
                        <button disabled={busy}>
                          {stages[stages.indexOf(order.status) + 1]}
                        </button>
                      </form>
                    )}
                    {driver &&
                      ["Left warehouse", "Arrived"].includes(order.status) && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                new Promise((resolve, reject) =>
                                  navigator.geolocation.getCurrentPosition(
                                    (p) => {
                                      portalApi(
                                        `/orders/${order.id}/location`,
                                        {
                                          latitude: p.coords.latitude,
                                          longitude: p.coords.longitude,
                                        },
                                      ).then(resolve, reject);
                                    },
                                    reject,
                                    {
                                      enableHighAccuracy: true,
                                      timeout: 20000,
                                    },
                                  ),
                                ),
                              "Location saved.",
                            )
                          }
                        >
                          Share current delivery location
                        </button>
                      )}
                  </section>
                )}
              </>
            )}
            {section === "account" && (
              <>
                <section className="cp-card">
                  <h2>Account & payments</h2>
                  <p>
                    Amount owed: {money(Math.max(0, data.account.balanceCents))}
                  </p>
                  <p>
                    Account credit / deposits:{" "}
                    {money(Math.max(0, -data.account.balanceCents))}
                  </p>
                  <p>Credit limit: {money(data.account.creditLimitCents)}</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(() =>
                        portalApi("/account", values(e.currentTarget)),
                      );
                    }}
                  >
                    <Field
                      label="Full name"
                      name="contactName"
                      value={data.account.contactName}
                    />
                    <Field
                      label="Business or customer name"
                      name="company"
                      value={data.account.company}
                    />
                    <Field
                      label="Address"
                      name="address"
                      value={data.account.address}
                    />
                    <Field
                      label="Telephone"
                      name="phone"
                      value={data.account.phone}
                    />
                    <button disabled={busy}>Save account details</button>
                  </form>
                </section>
                <section className="cp-card">
                  <h2>Payment history</h2>
                  {data.payments.map((p) => (
                    <p key={p.id}>
                      {p.reference} · {money(p.amountCents)} ·{" "}
                      {new Date(p.at).toLocaleString()} ·{" "}
                      {p.orderId || "Account deposit"}
                    </p>
                  ))}
                  {!data.payments.length && (
                    <p>No verified payments recorded.</p>
                  )}
                </section>
                {owner && (
                  <>
                    <section className="cp-card">
                      <h2>Record verified receipt</h2>
                      <p>
                        Record only a payment already received and checked. This
                        does not charge a customer.
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = values(e.currentTarget);
                          void run(
                            () =>
                              portalApi("/payments", {
                                ...f,
                                amountCents: Math.round(Number(f.amount) * 100),
                              }),
                            "Verified receipt recorded.",
                          );
                        }}
                      >
                        <Field label="Customer UID" name="customerUid" />
                        <Field
                          label="Order ID (leave blank for deposit)"
                          name="orderId"
                          required={false}
                        />
                        <Field label="Amount USD" name="amount" type="text" />
                        <Field
                          label="Unique receipt reference"
                          name="reference"
                        />
                        <button disabled={busy}>Record receipt</button>
                      </form>
                    </section>
                    {data.accounts.map((a) => (
                      <section className="cp-card" key={a.uid}>
                        <h3>{a.company || a.contactName || a.uid}</h3>
                        <p>
                          UID: {a.uid} · Balance {money(a.balanceCents)}
                        </p>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = values(e.currentTarget);
                            void run(() =>
                              portalApi(`/accounts/${a.uid}/credit`, {
                                creditLimitCents: Math.round(
                                  Number(f.limit) * 100,
                                ),
                              }),
                            );
                          }}
                        >
                          <Field
                            label="Approved credit limit USD"
                            name="limit"
                            value={(a.creditLimitCents || 0) / 100}
                          />
                          <button disabled={busy}>Save credit limit</button>
                        </form>
                      </section>
                    ))}
                  </>
                )}
              </>
            )}

            {section === "stock" && staff && (
              <>
                <h2>Warehouse inventory</h2>
                {data.catalog.map((p) => {
                  const s = data.inventory.find((i) => i.productId === p.id);
                  return (
                    <section className="cp-card" key={p.id}>
                      <h3>{p.name}</h3>
                      <p>
                        Physical: {s?.onHandBoxes || 0} · Reserved:{" "}
                        {s?.reservedBoxes || 0} · Available:{" "}
                        {(s?.onHandBoxes || 0) - (s?.reservedBoxes || 0)} boxes
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = values(e.currentTarget);
                          void run(() =>
                            portalApi(`/inventory/${p.id}`, {
                              onHandBoxes: Number(f.boxes),
                              priceCents: Math.round(Number(f.price) * 100),
                              threshold: Number(f.threshold),
                            }),
                          );
                        }}
                      >
                        <Field
                          label="Physical boxes"
                          name="boxes"
                          type="number"
                          value={s?.onHandBoxes || 0}
                        />
                        <Field
                          label="Approved price USD per box"
                          name="price"
                          value={s ? (s.priceCents / 100).toFixed(2) : ""}
                        />
                        <Field
                          label="Low-stock threshold boxes"
                          name="threshold"
                          type="number"
                          value={s?.threshold || 0}
                        />
                        <button disabled={busy}>Save stock record</button>
                      </form>
                    </section>
                  );
                })}
              </>
            )}
            {section === "equipment" && (
              <>
                <h2>
                  {customer
                    ? "Equipment assigned to your business"
                    : "Equipment register"}
                </h2>
                {data.equipment.map((e) => (
                  <article className="cp-card" key={e.id}>
                    <h3>{e.name}</h3>
                    <p>
                      Quantity: {e.quantity} · {e.ownership} · Holder:{" "}
                      {e.holderUid || "Warehouse"}
                    </p>
                    {(owner || data.role === "warehouse") && e.holderUid && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => portalApi(`/equipment/${e.id}/return`, {}),
                            "Equipment returned to warehouse.",
                          )
                        }
                      >
                        Record equipment return
                      </button>
                    )}
                  </article>
                ))}
                {!data.equipment.length && <p>No equipment recorded.</p>}
                {staff && (
                  <section className="cp-card">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = values(e.currentTarget);
                        void run(() =>
                          portalApi("/equipment", {
                            ...f,
                            quantity: Number(f.quantity),
                          }),
                        );
                      }}
                    >
                      <Field label="Equipment name" name="name" />
                      <Field label="Quantity" name="quantity" type="number" />
                      <Field
                        label="Holder customer UID (blank for warehouse)"
                        name="holderUid"
                        required={false}
                      />
                      <Field label="Ownership or loan terms" name="ownership" />
                      <button disabled={busy}>Record equipment</button>
                    </form>
                  </section>
                )}
              </>
            )}
            {section === "prospects" &&
              ["ceo", "admin", "sales"].includes(data.role) && (
                <>
                  <h2>Prospect Hub</h2>
                  {prospects.map((p) => (
                    <article className="cp-card" key={p.id}>
                      <h3>{p.company}</h3>
                      <p>
                        {p.contactName} · {p.phone} · {p.stage}
                      </p>
                      <p>{p.notes}</p>
                      <div className="cp-actions">
                        <a
                          href={`${base}/visits?prospectId=${encodeURIComponent(p.id)}`}
                        >
                          Record field visit
                        </a>
                        <a
                          href={`${base}/trials?prospectId=${encodeURIComponent(p.id)}`}
                        >
                          Issue trial stock
                        </a>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = values(e.currentTarget);
                          void run(
                            () =>
                              portalApi(`/prospects/${p.id}/activate`, {
                                customerUid: f.customerUid,
                              }),
                            "Customer linked to prospect.",
                          );
                        }}
                      >
                        <Field
                          label="Registered customer UID"
                          name="customerUid"
                        />
                        <button>Activate registered customer</button>
                      </form>
                    </article>
                  ))}
                  {!prospects.length && <p>No prospects recorded.</p>}
                  <section className="cp-card">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(() =>
                          portalApi("/prospects", values(e.currentTarget)),
                        );
                      }}
                    >
                      <Field name="company" label="Business name" />
                      <Field name="contactName" label="Contact name" />
                      <Field name="phone" label="Telephone" />
                      <Field name="stage" label="Current stage" />
                      <Field name="notes" label="Notes" required={false} />
                      <button disabled={busy}>Save prospect</button>
                    </form>
                  </section>
                </>
              )}
            {section === "market" && owner && (
              <>
                <h2>Market Intelligence</h2>
                <p>
                  Recorded product demand and stock. No external market
                  estimates.
                </p>
                {data.catalog.map((p) => {
                  const lines = rows
                    .flatMap((o) => o.lines)
                    .filter((l) => l.productId === p.id);
                  const stock = data.inventory.find(
                    (i) => i.productId === p.id,
                  );
                  return (
                    <article className="cp-card" key={p.id}>
                      <h3>{p.name}</h3>
                      <p>
                        Ordered: {lines.reduce((s, l) => s + l.boxes, 0)} boxes
                        · Recorded order value:{" "}
                        {money(lines.reduce((s, l) => s + l.amountCents, 0))}
                      </p>
                      <p>
                        Available stock:{" "}
                        {stock ? stock.onHandBoxes - stock.reservedBoxes : 0}{" "}
                        boxes
                      </p>
                    </article>
                  );
                })}
                <a
                  href="/ceo/stock"
                  onClick={(e) => {
                    e.preventDefault();
                    go("/ceo/stock");
                  }}
                >
                  Open warehouse inventory
                </a>
              </>
            )}
            {section === "reference" && owner && (
              <section className="cp-card">
                <h2>Reference Library</h2>
                <a
                  href="/documents/horn-and-harvest-company-profile.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  View Company Profile
                </a>
                <p>Only approved public documents are shown.</p>
              </section>
            )}
            {![
              "overview",
              "orders",
              "new-order",
              "account",
              "stock",
              "equipment",
              "prospects",
              "market",
              "reference",
              "alerts",
              "attendance",
              "routes",
              "fleet",
              "intakes",
              "batches",
              "forecasts",
              "visits",
              "trials",
              "notes",
              "expenses",
              "pricing",
              "staff",
            ].includes(section) && (
              <p>
                Page not found.{" "}
                <a href={`${base}/overview`}>Return to overview</a>
              </p>
            )}
          </>
        )}
      </main>
      <footer>Dhadhanka Awoowayaasheen — The Taste of Our Ancestors.</footer>
    </div>
  );
}
