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

function nowIso() { return new Date().toISOString(); }

// Sans dépendance crypto (simple + suffisant)
function rand(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default async (req) => {
  try {
    if (req.method === "OPTIONS") return json(204, { ok: true });
    if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

    let body = {};
    try { body = await req.json(); }
    catch { return json(400, { ok: false, error: "invalid_json" }); }

    const name = (body.name || "").trim();
    const boatsN = Number(body.boatsN);

    if (!name) return json(400, { ok: false, error: "missing_name" });
    if (!Number.isInteger(boatsN) || boatsN < 1 || boatsN > 20) {
      return json(400, { ok: false, error: "invalid_boatsN" });
    }

    const store = getStore("qr"); // aligné QR

    const centerId = "c_" + rand(24);
    const centerKey = "OI-" + rand(4).toUpperCase() + "-" + rand(4).toUpperCase() + "-" + rand(4).toUpperCase();
    const t = nowIso();

    const centerRecord = {
      centerId,
      centerName: name,
      boatsN,
      status: "active",
      createdAt: t,
      updatedAt: t,
      centerKeyActive: centerKey,
    };

    const centerKeyRecord = {
      centerKey,
      centerId,
      status: "active",
      createdAt: t,
    };

    await store.set(`centers/${centerId}`, JSON.stringify(centerRecord));
    await store.set(`centerKeys/${centerKey}`, JSON.stringify(centerKeyRecord));

    return json(200, { ok: true, centerId, centerName: name, boatsN, centerKey });

  } catch (e) {
    return json(500, { ok: false, error: "internal_error", message: e?.message || String(e) });
  }
};