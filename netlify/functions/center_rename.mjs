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

async function requireValidCenterByKey(store, centerKey) {
  const keyRaw = await store.get(`centerKeys/${centerKey}`);
  if (!keyRaw) return { ok: false, status: 404, error: "unknown_centerKey" };

  const keyRec = JSON.parse(keyRaw);
  if (keyRec.status !== "active") return { ok: false, status: 403, error: "centerKey_disabled" };

  const centerRaw = await store.get(`centers/${keyRec.centerId}`);
  if (!centerRaw) return { ok: false, status: 404, error: "center_not_found" };

  const centerRec = JSON.parse(centerRaw);

  if (!["active", "trial"].includes(centerRec.status)) {
    return { ok: false, status: 403, error: "center_disabled" };
  }

  if (
    centerRec.status === "trial" &&
    centerRec.trialEndsAt &&
    Date.now() > new Date(centerRec.trialEndsAt).getTime()
  ) {
    return { ok: false, status: 403, error: "trial_expired" };
  }

  if (centerRec.allowNewJoin === false) {
    return { ok: false, status: 403, error: "join_blocked" };
  }

  return { ok: true, centerId: centerRec.centerId, centerRec };
}

export default async (req) => {
  try {
    if (req.method === "OPTIONS") return json(204, { ok: true });
    if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

    let body = {};
    try { body = await req.json(); }
    catch { return json(400, { ok: false, error: "invalid_json" }); }

    const centerKey = String(body.centerKey || "").trim();
    const centerName = String(body.centerName || "").trim();

    if (!centerKey) return json(400, { ok: false, error: "missing_centerKey" });
    if (!centerName) return json(400, { ok: false, error: "missing_centerName" });
    if (centerName.length > 80) return json(400, { ok: false, error: "centerName_too_long" });

    const store = getStore("qr");
    const auth = await requireValidCenterByKey(store, centerKey);
    if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

    const centerRec = auth.centerRec || {};
    centerRec.centerName = centerName;
    centerRec.updatedAt = Date.now();

    await store.set(`centers/${auth.centerId}`, JSON.stringify(centerRec));

    return json(200, {
      ok: true,
      centerId: auth.centerId,
      centerName: centerRec.centerName,
      boatsN: centerRec.boatsN || 1,
      updatedAt: centerRec.updatedAt || 0,
    });
  } catch (e) {
    return json(500, { ok: false, error: "internal_error", message: e?.message || String(e) });
  }
};