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

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "bad_method" });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { ok: false, error: "bad_json" });
    }

    const centerId = (body.centerId || "").toString().trim();
    if (!centerId) return json(400, { ok: false, error: "missing_centerId" });

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
    const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || "";
    const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

    if (!STRIPE_SECRET_KEY) return json(500, { ok: false, error: "stripe_secret_missing" });
    if (!STRIPE_PRICE_ID) return json(500, { ok: false, error: "stripe_price_missing" });
    if (!PUBLIC_BASE_URL) return json(500, { ok: false, error: "public_base_url_missing" });

    // Read center record (server source of truth)
    const store = getStore("qr");
    const centerRaw = await store.get(`centers/${centerId}`);
    if (!centerRaw) return json(404, { ok: false, error: "center_not_found" });

    const centerRec = JSON.parse(centerRaw);

    // Optional: refuse if center disabled (you can loosen if desired)
    if (centerRec.status === "disabled") {
      return json(403, { ok: false, error: "center_disabled" });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

    // Subscription checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      // Link payment to center deterministically
      metadata: { centerId },
      client_reference_id: centerId,

      subscription_data: { metadata: { centerId } },
      success_url: `${PUBLIC_BASE_URL}/app/index.html#paid=success`,
      cancel_url: `${PUBLIC_BASE_URL}/app/index.html#paid=cancel`,
      // Optional: allow promo codes
      // allow_promotion_codes: true,
    });

    // Optional: write a breadcrumb (non-critical)
    try {
      centerRec.updatedAt = nowIso();
      centerRec.billing = centerRec.billing || { provider: "stripe" };
      centerRec.billing.provider = "stripe";
      centerRec.billing.lastCheckoutSessionId = session.id;
      await store.set(`centers/${centerId}`, JSON.stringify(centerRec));
    } catch (_) {
      // non-blocking
    }

    return json(200, { ok: true, checkoutUrl: session.url });
   } catch (e) {
    console.error("[create_checkout_session] failed:", e?.message || e);
    if (e?.raw) console.error("[create_checkout_session] raw:", e.raw);
    return json(500, {
      ok: false,
      error: "payment_session_failed",
      detail: e?.message ? String(e.message) : "unknown",
    });
  }
}