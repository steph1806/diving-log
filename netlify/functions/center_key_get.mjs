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

export default async (req) => {
  try {
    if (req.method === "OPTIONS") return json(204, { ok: true });
    if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

    let body = {};
    try { body = await req.json(); }
    catch { return json(400, { ok: false, error: "invalid_json" }); }

    const centerId = (body.centerId || "").trim();
    if (!centerId) return json(400, { ok: false, error: "missing_centerId" });

    const store = getStore("qr");
    const centerRec = await store.getJSON(`centers/${centerId}`);
    if (!centerRec) return json(404, { ok: false, error: "center_not_found" });
    if (centerRec.status !== "active") return json(403, { ok: false, error: "center_disabled" });

    const centerKey = centerRec.centerKeyActive;
    if (!centerKey) return json(404, { ok: false, error: "centerKey_missing" });

    return json(200, { ok: true, centerKey });

  } catch (e) {
    return json(500, { ok: false, error: "internal_error", message: e?.message || String(e) });
  }
};