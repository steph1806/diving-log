import { getStore } from "@netlify/blobs";
import { requireValidCenterByKey } from "./_center_auth.mjs";

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

export default async (req) => {
  try {
    if (req.method === "OPTIONS") return json(204, { ok: true });
    if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

    let body = {};
    try { body = await req.json(); }
    catch { return json(400, { ok: false, error: "invalid_json" }); }

    const centerKey = (body.centerKey || "").trim();
    if (!centerKey) return json(400, { ok: false, error: "missing_centerKey" });

    const auth = await requireValidCenterByKey(centerKey);
    if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

    const store = getStore("qr");
    const raw = await store.get(`sites/${auth.centerId}`);
    if (!raw) {
      return json(200, { ok: true, centerId: auth.centerId, sites: [], updatedAt: 0 });
    }

    const rec = JSON.parse(raw);
    const sites = rec && rec.body ? JSON.parse(rec.body) : [];
    return json(200, {
      ok: true,
      centerId: auth.centerId,
      sites: Array.isArray(sites) ? sites : [],
      updatedAt: rec.updatedAt || 0,
    });

  } catch (e) {
    return json(500, { ok: false, error: "internal_error", message: e?.message || String(e) });
  }
};
