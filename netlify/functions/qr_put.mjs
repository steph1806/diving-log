import { getStore } from "@netlify/blobs";
import crypto from "crypto";

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

function makeId(len = 12) {
  // uppercase base32-ish, QR friendly
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export default async (req) => {
  try {
    if (req.method === "OPTIONS") return json(204, { ok: true });
    if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

    const payload = await req.json(); // ton JSON complet (manifest/page)
    if (!payload || typeof payload !== "object") {
      return json(400, { ok: false, error: "invalid_json" });
    }

    const store = getStore("qr"); // store name FIXE
    const id = makeId(12);

    const record = {
      createdAt: Date.now(),
      body: JSON.stringify(payload),
    };

    await store.set(id, JSON.stringify(record));
    return json(200, { ok: true, id });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};