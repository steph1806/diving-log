import { getStore } from "@netlify/blobs";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    },
  });
}

export default async (req) => {
  try {
    if (req.method === "OPTIONS") return json(204, { ok: true });
    if (req.method !== "GET") return json(405, { ok: false, error: "method_not_allowed" });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return json(400, { ok: false, error: "missing_id" });

    const store = getStore("qr");

    let raw = await store.get(id, { type: "text" });

    if (!raw) {
      // Edge propagation delay (Netlify Blobs)
      await new Promise(r => setTimeout(r, 80));
      raw = await store.get(id, { type: "text" });
    }

    if (!raw) {
      return json(404, { ok: false, error: "not_found" });
    }

   // unwrap record if needed
   let rec = null;
   try { rec = JSON.parse(raw); } catch (_) {}

   if (rec && typeof rec === "object" && typeof rec.body === "string") {
     return json(200, { ok: true, createdAt: rec.createdAt || Date.now(), body: rec.body });
   }

   // legacy: raw already is payload string
   return json(200, { ok: true, createdAt: Date.now(), body: raw });

  } catch (e) {
    return json(500, {
      ok: false,
      error: "internal_error",
      message: e?.message || String(e)
    });
  }
};