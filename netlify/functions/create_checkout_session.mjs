import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    },
  });
}

function nowIso() {
  return new Date().toISOString();
}

export default async (req) => {
  try {
    if (req.method === "OPTIONS") return json(204, { ok: true });
    if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

    let body = {};
    try { body = await req.json(); }
    catch { return json(400, { ok: false, error: "bad_json" }); }

    // accept both centerId and center_id (your point)
    const centerId = ((body.centerId ?? body.center_id) || "").toString().trim();
    if (!centerId) return json(400, { ok: false, error: "missing_centerId" });

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
    const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || "";
    const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

    if (!STRIPE_SECRET_KEY) return json(500, { ok: false, error: "stripe_secret_missing" });
    if (!STRIPE_PRICE_ID) return json(500, { ok: false, error: "stripe_price_missing" });
    if (!PUBLIC_BASE_URL) return json(500, { ok: false, error: "public_base_url_missing" });

    // Netlify Blobs (should now be configured correctly)
    const store = getStore("qr");
    const centerRaw = await store.get(`centers/${centerId}`);
    if (!centerRaw) return json(404, { ok: false, error: "center_not_found" });

    const centerRec = JSON.parse(centerRaw);
    if (centerRec.status === "disabled") return json(403, { ok: false, error: "center_disabled" });

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      metadata: { centerId },
      client_reference_id: centerId,
      subscription_data: { metadata: { centerId } },
      success_url: `${PUBLIC_BASE_URL}/app/index.html#paid=success`,
      cancel_url: `${PUBLIC_BASE_URL}/app/index.html#paid=cancel`,
      // allow_promotion_codes: true,
    });

    // breadcrumb non-critical
    try {
      centerRec.updatedAt = nowIso();
      centerRec.billing = centerRec.billing || {};
      centerRec.billing.provider = "stripe";
      centerRec.billing.lastCheckoutSessionId = session.id;
      await store.set(`centers/${centerId}`, JSON.stringify(centerRec));
    } catch (_) {}

    return json(200, { ok: true, checkoutUrl: session.url, centerId });
  } catch (e) {
    return json(500, {
      ok: false,
      error: "payment_session_failed",
      detail: e?.message || String(e),
      stripeType: e?.type || null,
    });
  }
};