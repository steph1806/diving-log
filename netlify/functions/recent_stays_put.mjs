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

    // --- normalize groupAssignments snapshot
    const rawGroups = (s && typeof s.groupAssignments === "object" && s.groupAssignments)
      ? s.groupAssignments
      : {};

    const groupAssignments = {};

    Object.keys(rawGroups).forEach(function(name){

      const nm = String(name || "").trim();
      if (!nm) return;

      const grp = Number(rawGroups[name] || 0);
      if (!grp) return;

      groupAssignments[nm] = grp;

    });
     out.push({
      id: String(s.id || "").trim() || `stay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      diverRefs,
      groupAssignments,
      createdAt: Number(s.createdAt || 0) || Date.now(),
      updatedAt: Number(s.updatedAt || 0) || Date.now(),
    });
  }

  return out
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 12);
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

    const recentStays = normalizeRecentStays(body.recentStays);
    if (!Array.isArray(body.recentStays)) {
      return json(400, { ok: false, error: "missing_recentStays" });
    }

    const auth = await requireValidCenterByKey(centerKey);
    if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

    const store = getStore("qr");

    const record = {
      updatedAt: Date.now(),
      body: JSON.stringify(recentStays),
    };

    await store.set(`recentStays/${auth.centerId}`, JSON.stringify(record));

    return json(200, {
      ok: true,
      centerId: auth.centerId,
      updatedAt: record.updatedAt
    });

  } catch (e) {
    return json(500, { ok: false, error: "internal_error", message: e?.message || String(e) });
  }
};