import { getStore } from "@netlify/blobs";
import { requireValidCenterByKey } from "./_center_auth.mjs";

const STORE_NAME = "qr";

function json(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function normalizeRecentStays(input) {
  const arr = Array.isArray(input) ? input : [];
  const out = [];

  for (const s of arr) {
    if (!s || typeof s !== "object") continue;

    const name = String(s.name || "").trim();
    if (!name) continue;

    const diverRefsRaw = Array.isArray(s.diverRefs) ? s.diverRefs : [];
    const diverRefs = [];
    const seen = new Set();

    for (const ref of diverRefsRaw) {
      if (!ref) continue;

      const id = String(ref.id || "").trim();
      const refName = String(ref.name || "").trim();
      if (!id && !refName) continue;

      const dedupKey = id ? `id:${id}` : `name:${refName.toLowerCase()}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      diverRefs.push({ id, name: refName });
    }

    out.push({
      id: String(s.id || "").trim() || `stay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      diverRefs,
      createdAt: Number(s.createdAt || 0) || Date.now(),
      updatedAt: Number(s.updatedAt || 0) || Date.now()
    });
  }

  return out
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 12);
}

export default async (req) => {
  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  try {
    const body = JSON.parse(req.body || "{}");
    const centerKey = String(body.centerKey || "").trim();
    if (!centerKey) {
      return json(400, { ok: false, error: "missing_centerKey" });
    }

    const auth = await requireValidCenterByKey(centerKey);
    if (!auth || !auth.ok || !auth.centerId) {
      return json(auth?.status || 401, {
        ok: false,
        error: auth?.error || "unauthorized"
      });
    }

    const centerId = String(auth.centerId).trim();
    const store = getStore(STORE_NAME);
    const saved = await store.get(`recentStays/${centerId}`, { type: "json" });

    const recentStays = normalizeRecentStays(saved && saved.recentStays);

    return json(200, {
      ok: true,
      recentStays,
      updatedAt: Number(saved && saved.updatedAt || 0) || 0
    });
  } catch (e) {
    return json(500, {
      ok: false,
      error: e && e.message ? e.message : "recent_stays_get_failed"
    });
  }
};