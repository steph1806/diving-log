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

    const centerKey = (body.centerKey || "").trim();
    if (!centerKey) return json(400, { ok: false, error: "missing_centerKey" });

    const store = getStore("qr");

    const keyRaw = await store.get(`centerKeys/${centerKey}`);
    if (!keyRaw) return json(404, { ok:false, error:"unknown_centerKey" });
    const keyRec = JSON.parse(keyRaw);
    if (keyRec.status !== "active") return json(403, { ok: false, error: "centerKey_disabled" });

    const centerRaw = await store.get(`centers/${keyRec.centerId}`);
    if (!centerRaw) return json(404, { ok:false, error:"center_not_found" });
    const centerRec = JSON.parse(centerRaw);
    // Accept active OR trial
    if (!["active", "trial"].includes(centerRec.status)) {
      return json(403, { ok:false, error:"center_disabled" });
    }
    // Trial expiration check
    if (
      centerRec.status === "trial" &&
      centerRec.trialEndsAt &&
      Date.now() > new Date(centerRec.trialEndsAt).getTime()
    ) {
      return json(403, { ok:false, error:"trial_expired" });
    }
    // Allow new join flag
    if (centerRec.allowNewJoin === false) {
      return json(403, { ok:false, error:"join_blocked" });
    }

    return json(200, {
      ok: true,
      centerId: centerRec.centerId,
      centerName: centerRec.centerName,
      boatsN: centerRec.boatsN,
    });

  } catch (e) {
    return json(500, { ok: false, error: "internal_error", message: e?.message || String(e) });
  }
};