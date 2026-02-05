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
    if (event.httpMethod !== "GET") return json(405, { ok: false, error: "method_not_allowed" });

    const id = event.queryStringParameters?.id;
    if (!id) return json(400, { ok: false, error: "missing_id" });

    const store = getStore("qr"); // IMPORTANT: store name = "qr"
    const body = await store.get(id, { type: "text" });

    if (!body) return json(404, { ok: false, error: "not_found" });

    return json(200, { ok: true, body });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};