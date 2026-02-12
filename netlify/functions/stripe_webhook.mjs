import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function getRawBody(event) {
  const body = event.body || "";
  if (event.isBase64Encoded) return Buffer.from(body, "base64");
  return Buffer.from(body, "utf8");
}

async function loadCenter(store, centerId) {
  const raw = await store.get(`centers/${centerId}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

async function saveCenter(store, centerId, centerRec) {
  centerRec.updatedAt = nowIso();
  await store.set(`centers/${centerId}`, JSON.stringify(centerRec));
}

export async function handler(event) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!STRIPE_SECRET_KEY) return json(500, { ok: false, error: "stripe_secret_missing" });
  if (!STRIPE_WEBHOOK_SECRET) return json(500, { ok: false, error: "stripe_webhook_secret_missing" });

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "bad_method" });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  const sig =
    event.headers["stripe-signature"] ||
    event.headers["Stripe-Signature"] ||
    "";

  if (!sig) return json(400, { ok: false, error: "missing_stripe_signature" });

  let stripeEvent;
  try {
    const rawBody = getRawBody(event);
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return json(400, { ok: false, error: "invalid_signature" });
  }

  const store = getStore("qr");

  try {
    const type = stripeEvent.type;

    // 1) Payment completed: activate center and store subscription link
    if (type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      const centerId = session?.metadata?.centerId || session?.client_reference_id || "";
      if (!centerId) return json(200, { ok: true, ignored: true });

      const centerRec = await loadCenter(store, centerId);
      if (!centerRec) return json(200, { ok: true, ignored: true });

      // Fetch subscription to get current_period_end (authoritative)
      let sub = null;
      if (session.subscription) {
        sub = await stripe.subscriptions.retrieve(session.subscription);
      }

      centerRec.status = "active"; // paid
      centerRec.trialEndsAt = centerRec.trialEndsAt ?? null;

      centerRec.billing = centerRec.billing || {};
      centerRec.billing.provider = "stripe";
      centerRec.billing.customerId = session.customer || centerRec.billing.customerId || null;
      centerRec.billing.subscriptionId = session.subscription || centerRec.billing.subscriptionId || null;
      centerRec.billing.currentPeriodEnd = sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : centerRec.billing.currentPeriodEnd || null;

      await saveCenter(store, centerId, centerRec);
      return json(200, { ok: true });
    }

    // 2) Invoice paid: extend paid period
    if (type === "invoice.paid") {
      const inv = stripeEvent.data.object;
      const subscriptionId = inv.subscription;
      if (!subscriptionId) return json(200, { ok: true, ignored: true });

      // Retrieve subscription to get current_period_end
      const sub = await stripe.subscriptions.retrieve(subscriptionId);

      // Find center by scanning? (avoid) -> we rely on metadata stored on subscription
      // Best practice: store centerId in subscription metadata at creation time.
      // If not present, we try to use customer lookup in your own mapping (not implemented here).
      const centerId = sub?.metadata?.centerId || "";
      if (!centerId) return json(200, { ok: true, ignored: true });

      const centerRec = await loadCenter(store, centerId);
      if (!centerRec) return json(200, { ok: true, ignored: true });

      centerRec.status = "active";
      centerRec.billing = centerRec.billing || {};
      centerRec.billing.provider = "stripe";
      centerRec.billing.subscriptionId = subscriptionId;
      centerRec.billing.customerId = sub.customer || centerRec.billing.customerId || null;
      centerRec.billing.currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : centerRec.billing.currentPeriodEnd || null;

      await saveCenter(store, centerId, centerRec);
      return json(200, { ok: true });
    }

    // 3) Payment failed: suspend/disable (strict)
    if (type === "invoice.payment_failed") {
      const inv = stripeEvent.data.object;
      const subscriptionId = inv.subscription;
      if (!subscriptionId) return json(200, { ok: true, ignored: true });

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const centerId = sub?.metadata?.centerId || "";
      if (!centerId) return json(200, { ok: true, ignored: true });

      const centerRec = await loadCenter(store, centerId);
      if (!centerRec) return json(200, { ok: true, ignored: true });

      centerRec.status = "disabled"; // or "suspended" if you prefer grace
      centerRec.billing = centerRec.billing || {};
      centerRec.billing.provider = "stripe";
      centerRec.billing.subscriptionId = subscriptionId;
      centerRec.billing.customerId = sub.customer || centerRec.billing.customerId || null;

      await saveCenter(store, centerId, centerRec);
      return json(200, { ok: true });
    }

    // 4) Subscription canceled/deleted: disable
    if (type === "customer.subscription.deleted") {
      const sub = stripeEvent.data.object;
      const centerId = sub?.metadata?.centerId || "";
      if (!centerId) return json(200, { ok: true, ignored: true });

      const centerRec = await loadCenter(store, centerId);
      if (!centerRec) return json(200, { ok: true, ignored: true });

      centerRec.status = "disabled";
      centerRec.billing = centerRec.billing || {};
      centerRec.billing.provider = "stripe";
      centerRec.billing.subscriptionId = sub.id;
      centerRec.billing.customerId = sub.customer || centerRec.billing.customerId || null;

      await saveCenter(store, centerId, centerRec);
      return json(200, { ok: true });
    }

    // Default: ignore other events
    return json(200, { ok: true, ignored: true });
  } catch (e) {
    // Webhook must return 2xx for Stripe retry logic? No: returning 500 triggers retry (good).
    return json(500, { ok: false, error: "webhook_processing_failed" });
  }
}