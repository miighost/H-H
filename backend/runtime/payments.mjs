import express from "express";
import crypto from "node:crypto";
import { Fault, integer, text } from "./domain.mjs";
export const cents = (v) => {
  if (!/^\d+(\.\d{1,2})?$/.test(String(v)))
    throw new Fault("Invalid payment amount.");
  const [a, b = ""] = String(v).split(".");
  return integer(Number(a) * 100 + Number(b.padEnd(2, "0")));
};
export async function waafi(serviceName, params, fetcher = fetch) {
  const {
    WAAFI_MERCHANT_UID: merchantUid,
    WAAFI_STORE_ID: storeId,
    WAAFI_HPP_KEY: hppKey,
    WAAFI_API_URL: url,
  } = process.env;
  if (!merchantUid || !storeId || !hppKey || !url)
    throw new Fault("WaafiPay merchant configuration is required.", 503);
  const target = new URL(url);
  if (
    target.protocol !== "https:" ||
    !(
      target.hostname === "waafipay.com" ||
      target.hostname.endsWith(".waafipay.com")
    )
  )
    throw new Fault("Invalid gateway endpoint.", 503);
  const response = await fetcher(target, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      schemaVersion: "1.0",
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      channelName: "WEB",
      serviceName,
      serviceParams: {
        merchantUid,
        storeId: Number(storeId),
        hppKey,
        ...params,
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok || String(data.errorCode) !== "0")
    throw new Fault("Gateway request was rejected.", 502);
  return data.params;
}
export function verifyWebhook(raw, headers, secret, now = Date.now()) {
  const ts = headers["x-webhook-timestamp"],
    id = headers["x-webhook-event-id"],
    signature = headers["x-webhook-signature"];
  if (
    !secret ||
    !/^[\w.-]{1,150}$/.test(String(id)) ||
    !/^\d+$/.test(String(ts)) ||
    Math.abs(now / 1000 - Number(ts)) > 300 ||
    !/^[a-f0-9]{64}$/.test(String(signature))
  )
    throw new Fault("Invalid webhook authentication.", 401);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${id}.`)
    .update(raw)
    .digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)))
    throw new Fault("Invalid webhook signature.", 401);
  return id;
}
export function paymentWebhooks({ db }) {
  const r = express.Router();
  r.post(
    "/waafi/webhook",
    express.raw({ type: "application/json", limit: "128kb" }),
    async (req, res) => {
      try {
        const body = JSON.parse(req.body.toString());
        if (body.event === "webhook.test") return res.status(200).send("OK");
        if (!db) throw new Fault("Database configuration is required.", 503);
        const id = verifyWebhook(
          req.body,
          req.headers,
          process.env.WAAFI_WEBHOOK_SECRET,
        );
        if (body.merchant_uid !== process.env.WAAFI_MERCHANT_UID)
          throw new Fault("Merchant mismatch.", 403);
        await db.runTransaction(async (t) => {
          const ref = db.collection("hhPaymentEvents").doc(id),
            d = await t.get(ref);
          if (!d.exists)
            t.set(ref, {
              body,
              state: "Pending",
              receivedAt: new Date().toISOString(),
              attempts: 0,
            });
        });
        res.send("OK");
      } catch (e) {
        res
          .status(e.status || 400)
          .json({ error: e.status ? e.message : "Invalid webhook body." });
      }
    },
  );
  return r;
}
export function paymentRoutes(r, { db, safe, allowed }) {
  r.post(
    "/orders/:id/checkout",
    safe(async (req, res) => {
      if (req.role !== "customer")
        throw new Fault("Customer account required.", 403);
      if (process.env.PAYMENTS_COMMISSIONED !== "true")
        throw new Fault(
          "Live payments are awaiting merchant commissioning.",
          503,
        );
      const phone = text(req.body.phone, 20);
      if (!/^252\d{8,12}$/.test(phone))
        throw new Fault(
          "Enter a Somali wallet number in international format.",
        );
      const key = text(req.get("Idempotency-Key"), 100);
      if (!/^[\w-]+$/.test(key))
        throw new Fault("Invalid checkout request key.");
      const id = crypto
          .createHash("sha256")
          .update(req.params.id + ":" + key)
          .digest("hex")
          .slice(0, 24),
        pr = db.collection("hhPaymentSessions").doc(id);
      let session = await db.runTransaction(async (t) => {
        const prior = await t.get(pr),
          or = db.collection("hhOrders").doc(req.params.id),
          d = await t.get(or);
        if (!d.exists) throw new Fault("Order not found.", 404);
        const o = d.data();
        allowed(req, o);
        if (o.status === "Cancelled" || o.paidCents >= o.totalCents)
          throw new Fault("No order balance is payable.", 409);
        if (prior.exists) return prior.data();
        const open = await t.get(
          db.collection("hhPaymentSessions").where("orderId", "==", o.id),
        );
        if (
          open.docs.some((x) =>
            ["Pending", "Creating"].includes(x.data().state),
          )
        )
          throw new Fault(
            "An existing payment attempt needs reconciliation before another is started.",
            409,
          );
        const value = {
          referenceId: id,
          orderId: o.id,
          customerUid: o.customerUid,
          amountCents: o.totalCents - o.paidCents,
          phone,
          createdAt: new Date().toISOString(),
          state: "Pending",
        };
        t.set(pr, value);
        return value;
      });
      if (session.paymentUrl)
        return res.json({ paymentUrl: session.paymentUrl, referenceId: id });
      if (session.state !== "Pending")
        throw new Fault("Payment session is already closed.", 409);
      const base = new URL(process.env.PUBLIC_BASE_URL || "");
      if (base.protocol !== "https:")
        throw new Fault("HTTPS public base URL required.", 503);
      await db.runTransaction(async (t) => {
        const current = await t.get(pr);
        if (current.data().state !== "Pending" || current.data().creatingAt)
          throw new Fault(
            "Payment creation is already in progress. Check payment status before retrying.",
            409,
          );
        t.update(pr, {
          state: "Creating",
          creatingAt: new Date().toISOString(),
        });
      });
      const result = await waafi("HPP_PURCHASE", {
        paymentMethod: "MWALLET_ACCOUNT",
        hppSuccessCallbackUrl: new URL("/payment/success", base).href,
        hppFailureCallbackUrl: new URL("/payment/failure", base).href,
        hppRespDataFormat: 2,
        payerInfo: { subscriptionId: phone },
        transactionInfo: {
          referenceId: id,
          amount: session.amountCents / 100,
          currency: "USD",
          description: "Horn & Harvest order " + session.orderId,
        },
      });
      const paymentUrl = result.directPaymentLink || result.hppUrl,
        u = new URL(paymentUrl);
      if (
        u.protocol !== "https:" ||
        !(u.hostname === "waafipay.com" || u.hostname.endsWith(".waafipay.com"))
      )
        throw new Fault("Untrusted payment URL.", 502);
      await pr.update({ paymentUrl, state: "Pending" });
      res.json({ paymentUrl, referenceId: id });
    }),
  );
  r.post(
    "/orders/:id/reconcile-payment",
    safe(async (req, res) => {
      const d = await db.collection("hhOrders").doc(req.params.id).get();
      if (!d.exists) throw new Fault("Order not found.", 404);
      allowed(req, d.data());
      if (!["customer", "admin", "ceo"].includes(req.role))
        throw new Fault("Account access required.", 403);
      const sessions = await db
        .collection("hhPaymentSessions")
        .where("orderId", "==", req.params.id)
        .get();
      for (const s of sessions.docs) {
        if (!["Pending", "Creating"].includes(s.data().state)) continue;
        const p = await waafi("HPP_GETTRANINFO", { referenceId: s.id });
        if (p.status === "Approved" || p.tranStatusDesc === "Approved")
          await settleGateway(db, s.id, {
            referenceId: p.referenceId,
            transactionId: String(p.transactionId),
            amountCents: cents(p.amount ?? p.tranAmount),
            currency: p.currency,
          });
      }
      res.json({ ok: true });
    }),
  );
}
export async function settleGateway(db, sessionId, payment) {
  const ref = db.collection("hhPaymentSessions").doc(sessionId);
  await db.runTransaction(async (t) => {
    const s = await t.get(ref);
    if (!s.exists) throw new Fault("Unrecognised gateway reference.", 409);
    const v = s.data();
    if (
      payment.referenceId !== sessionId ||
      payment.currency !== "USD" ||
      payment.amountCents !== v.amountCents
    )
      throw new Fault("Gateway amount, currency or reference mismatch.", 409);
    const transactionId = text(payment.transactionId, 100);
    if (!/^[\w.-]+$/.test(transactionId) || transactionId === "0")
      throw new Fault("Invalid transaction identifier.");
    const tr = db.collection("hhGatewayTransactions").doc(transactionId),
      prior = await t.get(tr);
    if (prior.exists) {
      if (prior.data().referenceId !== sessionId)
        throw new Fault("Gateway transaction was reused.", 409);
      return;
    }
    const or = db.collection("hhOrders").doc(v.orderId),
      o = await t.get(or),
      ar = db.collection("hhAccounts").doc(v.customerUid),
      a = await t.get(ar);
    if (!o.exists || !a.exists || o.data().customerUid !== v.customerUid)
      throw new Fault("Payment target is missing.", 409);
    const allocation =
      o.data().status === "Cancelled"
        ? 0
        : Math.min(
            v.amountCents,
            Math.max(0, o.data().totalCents - o.data().paidCents),
          );
    t.set(tr, {
      ...payment,
      orderId: v.orderId,
      customerUid: v.customerUid,
      allocatedCents: allocation,
      reversedCents: 0,
      at: new Date().toISOString(),
    });
    t.set(db.collection("hhPayments").doc("waafi-" + transactionId), {
      customerUid: v.customerUid,
      orderId: allocation ? v.orderId : null,
      amountCents: v.amountCents,
      reference: transactionId,
      method: "WaafiPay verified settlement",
      at: new Date().toISOString(),
    });
    t.update(ar, { balanceCents: a.data().balanceCents - v.amountCents });
    if (allocation)
      t.update(or, { paidCents: o.data().paidCents + allocation });
    t.update(ref, { state: "Settled", transactionId });
  });
}
export async function processPaymentEvents(db, fetcher = fetch) {
  const s = await db
    .collection("hhPaymentEvents")
    .where("state", "==", "Pending")
    .get();
  for (const d of s.docs) {
    const e = d.data(),
      body = e.body,
      p = body.payment;
    try {
      if (body.event === "authorization" && p?.status === "APPROVED") {
        const verified = await waafi(
          "HPP_GETTRANINFO",
          { referenceId: p.reference_id },
          fetcher,
        );
        if (
          verified.status !== "Approved" &&
          verified.tranStatusDesc !== "Approved"
        )
          throw new Fault("Payment has not been verified as approved.", 409);
        await settleGateway(db, p.reference_id, {
          referenceId: verified.referenceId,
          transactionId: String(verified.transactionId),
          amountCents: cents(verified.amount ?? verified.tranAmount),
          currency: verified.currency,
        });
      } else if (
        (body.event === "refund" && p?.status === "APPROVED") ||
        (body.event === "void" && p?.status === "CANCELLED")
      ) {
        await db.runTransaction(async (t) => {
          const original = db
              .collection("hhGatewayTransactions")
              .doc(text(p.original_transaction_id, 100)),
            tr = await t.get(original);
          if (!tr.exists)
            throw new Fault("Original settlement not received yet.", 409);
          const v = tr.data(),
            amount = cents(p.amount),
            rr = db
              .collection("hhGatewayReversals")
              .doc(text(p.transaction_id, 100)),
            prior = await t.get(rr);
          if (prior.exists) return;
          if (
            p.currency !== "USD" ||
            amount <= 0 ||
            v.reversedCents + amount > v.amountCents
          )
            throw new Fault("Invalid gateway reversal amount.", 409);
          const ar = db.collection("hhAccounts").doc(v.customerUid),
            a = await t.get(ar),
            or = db.collection("hhOrders").doc(v.orderId),
            o = await t.get(or);
          const reverseAllocation = Math.min(
            amount,
            Math.max(0, v.allocatedCents - v.reversedCents),
            o.data()?.paidCents || 0,
          );
          t.set(rr, {
            originalTransactionId: p.original_transaction_id,
            amountCents: amount,
            at: new Date().toISOString(),
          });
          t.update(original, { reversedCents: v.reversedCents + amount });
          t.update(ar, { balanceCents: a.data().balanceCents + amount });
          if (reverseAllocation)
            t.update(or, { paidCents: o.data().paidCents - reverseAllocation });
          t.set(
            db
              .collection("hhPayments")
              .doc("waafi-reversal-" + p.transaction_id),
            {
              customerUid: v.customerUid,
              orderId: v.orderId,
              amountCents: -amount,
              reference: p.transaction_id,
              method: "Verified gateway reversal",
              at: new Date().toISOString(),
            },
          );
        });
      }
      await db
        .collection("hhPaymentEvents")
        .doc(d.id)
        .update({ state: "Processed", processedAt: new Date().toISOString() });
    } catch (error) {
      await db
        .collection("hhPaymentEvents")
        .doc(d.id)
        .update({
          attempts: e.attempts + 1,
          lastError: String(error.message).slice(0, 200),
          lastAttemptAt: new Date().toISOString(),
        });
    }
  }
}
