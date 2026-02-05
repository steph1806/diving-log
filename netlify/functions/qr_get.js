import { getStore } from "@netlify/blobs";

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    },
    body: JSON.stringify(obj),
  };
}

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
    if (event.httpMethod !== "GET") return json(405, { ok: false, error: "Method not allowed" });

    const id = event.queryStringParameters?.id;
    if (!id) return json(400, { ok: false, error: "Missing id" });

    const store = getStore("qr"); // IMPORTANT: store = "qr"
    const body = await store.get(id);

    if (!body) return json(404, { ok: false, error: "Not found" });

    // IMPORTANT: resolveScannedQrText attend { ok:true, body: "...." }
    return json(200, { ok: true, body });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};