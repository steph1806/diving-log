import { getStore } from "@netlify/blobs";
import { randomBytes } from "crypto";

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

function makeId(len = 12) {
  // 12 chars base32-ish (A-Z2-7) stable for QR / URL
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
    if (event.httpMethod !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

    if (!event.body || typeof event.body !== "string") {
      return json(400, { ok: false, error: "missing_body" });
    }

    // Safety: limit size (QR payload stored server-side, but avoid abuse)
    if (event.body.length > 200_000) {
      return json(413, { ok: false, error: "payload_too_large" });
    }

    // Validate JSON (front sends JSON.stringify(pageObj))
    try { JSON.parse(event.body); } catch { return json(400, { ok: false, error: "invalid_json" }); }

    const store = getStore("qr"); // IMPORTANT: store name = "qr" (as in Netlify UI)
    const id = makeId(12);

    // Store raw JSON string (front expects j.body to be a string later)
    await store.set(id, event.body);

    return json(200, { ok: true, id });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};