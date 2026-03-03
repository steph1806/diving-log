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

function normKey(name) {
  return String(name || "").trim().toLowerCase();
}

function num(v, d=0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
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

    const incoming = body.sites;
    if (!Array.isArray(incoming)) return json(400, { ok: false, error: "missing_sites" });

    const auth = await requireValidCenterByKey(centerKey);
    if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

    const store = getStore("qr");
    const key = `sites/${auth.centerId}`;

    // Load existing snapshot
    let existingArr = [];
    const raw = await store.get(key);
    if (raw) {
      try {
        const rec = JSON.parse(raw);
        const arr = rec && rec.body ? JSON.parse(rec.body) : [];
        if (Array.isArray(arr)) existingArr = arr;
      } catch(_) {}
    }

    // Build map by normalized name
    const map = new Map();
    for (const s of existingArr) {
      if (!s || typeof s !== "object") continue;
      const k = normKey(s.name);
      if (!k) continue;
      map.set(k, s);
    }

    let merged = 0;
    for (const s of incoming) {
      if (!s || typeof s !== "object") continue;
      const k = normKey(s.name);
      if (!k) continue;

      const inTs = num(s.updatedAt, 0);
      const cur = map.get(k);
      const curTs = cur ? num(cur.updatedAt, 0) : -1;

      // Situation merge rule: newest updatedAt wins (per-site)
      if (!cur || inTs > curTs) {
        map.set(k, s);
        merged += 1;
      }
    }

    const out = Array.from(map.values());

    const record = {
      updatedAt: Date.now(),
      body: JSON.stringify(out),
    };
    await store.set(key, JSON.stringify(record));

    return json(200, { ok: true, centerId: auth.centerId, merged, updatedAt: record.updatedAt });

  } catch (e) {
    return json(500, { ok: false, error: "internal_error", message: e?.message || String(e) });
  }
};
