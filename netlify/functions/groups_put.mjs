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

function normalizeGroupsLibrary(input) {
  const arr = Array.isArray(input) ? input : [];
  const out = [];
  const seenGroups = new Set();

  for (const g of arr) {
    if (!g || typeof g !== "object") continue;

    const id = String(g.id || "").trim();
    if (!id) continue;
    if (seenGroups.has(id)) continue;
    seenGroups.add(id);

    const name = String(g.name || "").trim();

    const memberRefsRaw = Array.isArray(g.memberRefs) ? g.memberRefs : [];
    const memberRefs = [];
    const seenMembers = new Set();

    for (const ref of memberRefsRaw) {
      if (!ref) continue;

      const refId = String(ref.id || "").trim();
      const refName = String(ref.name || "").trim();

      if (!refId) continue; // ID-first rule
      if (seenMembers.has(refId)) continue;
      seenMembers.add(refId);

      memberRefs.push({ id: refId, name: refName });
    }

    out.push({
      id,
      name,
      memberRefs,
      createdAt: Number(g.createdAt || 0) || Date.now(),
      updatedAt: Number(g.updatedAt || 0) || Date.now(),
    });
  }

  return out.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
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

    const groupsLibrary = normalizeGroupsLibrary(body.groupsLibrary);
    if (!Array.isArray(body.groupsLibrary)) {
      return json(400, { ok: false, error: "missing_groupsLibrary" });
    }

    const auth = await requireValidCenterByKey(centerKey);
    if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

    const store = getStore("qr");

    const record = {
      updatedAt: Date.now(),
      body: JSON.stringify(groupsLibrary),
    };

    await store.set(`groupsLibrary/${auth.centerId}`, JSON.stringify(record));

    return json(200, {
      ok: true,
      centerId: auth.centerId,
      updatedAt: record.updatedAt
    });

  } catch (e) {
    return json(500, { ok: false, error: "internal_error", message: e?.message || String(e) });
  }
};