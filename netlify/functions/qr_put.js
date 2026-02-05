import { getStore } from "@netlify/blobs";
import crypto from "crypto";

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    },
    body: JSON.stringify(obj),
  };
}

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    const raw = event.body || "";
    // index envoie du JSON (pageObj) -> on stocke le JSON string tel quel
    let pageObj;
    try {
      pageObj = JSON.parse(raw);
    } catch {
      return json(400, { ok: false, error: "Invalid JSON body" });
    }

    const store = getStore("qr"); // IMPORTANT: store = "qr" (comme ton UI Netlify)
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

    await store.set(id, JSON.stringify(pageObj));

    // IMPORTANT: l’index attend { ok:true, id }
    return json(200, { ok: true, id });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};