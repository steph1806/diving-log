import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function nowIso() {
  return new Date().toISOString();
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

export default async (req) => {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!STRIPE_SECRET_KEY) return json(500, { ok: false, error: "stripe_secret_missing" });
  if (!STRIPE_WEBHOOK_SECRET) return json(500, { ok: false, error: "stripe_webhook_secret_missing" });

  if (req.method !== "POST") return json(405, { ok: false, error: "bad_method" });

  const sig = req.headers.get("stripe-signature") || "";
  if (!sig) return json(400, { ok: false, error: "missing_stripe_signature" });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  let stripeEvent;
  try {
    const raw = Buffer.from(await req.arrayBuffer());
    stripeEvent = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return json(400, { ok: false, error: "invalid_signature" });
  }

  const store = getStore("qr");
  const type = stripeEvent.type;

  try {
    if (type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      const centerId = session?.metadata?.centerId || session?.client_reference_id || "";
      if (!centerId) return json(200, { ok: true, ignored: true });

      const centerRec = await loadCenter(store, centerId);
      if (!centerRec) return json(200, { ok: true, ignored: true });

      let sub = null;
      if (session.subscription) {
        sub = await stripe.subscriptions.retrieve(session.subscription);
      }

      centerRec.status = "active";

      centerRec.billing = centerRec.billing || {};
      centerRec.billing.provider = "stripe";
      centerRec.billing.customerId = session.customer || centerRec.billing.customerId || null;
      centerRec.billing.subscriptionId = session.subscription || centerRec.billing.subscriptionId || null;
      centerRec.billing.currentPeriodEnd =
        sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString()
        : (centerRec.billing.currentPeriodEnd || null);

      await saveCenter(store, centerId, centerRec);
    }

    return json(200, { ok: true, type });
  } catch (e) {
    return json(500, { ok: false, error: "internal_error", message: e?.message || String(e) });
  }
};