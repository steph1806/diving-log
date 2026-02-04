// netlify/functions/_lib.js
import crypto from "crypto";
import { getStore as getBlobStore } from "@netlify/blobs";

export const STORE_NAME = "ocean_infinity_centers_v1"; // gardé pour compat / debug

// In-memory KV (works immediately; no deps; no platform config)
const MEM = new Map();

export function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(obj),
  };
}

export function badRequest(msg = "bad_request") {
  return json(400, { ok: false, error: msg });
}

export function methodNotAllowed() {
  return json(405, { ok: false, error: "method_not_allowed" });
}

export function normalizeBoatsN(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(8, Math.trunc(n)));
}

export function makeId(prefix) {
  return prefix + "_" + crypto.randomBytes(9).toString("base64url");
}

export function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret, "utf8").digest("hex");
}


// Durable store (Netlify Blobs). In prod this is the only correct way.
// Docs: getStore/set/get/delete  [oai_citation:1‡Netlify Docs](https://docs.netlify.com/blobs/overview/)
export async function store() {
  try {
    // PROD: Netlify Blobs (persistant, partagé)
    const { getStore } = await import("@netlify/blobs");
    const B = getStore(STORE_NAME);

    return {
      async get(k) {
        const v = await B.get(k, { type: "text" });
        return v == null ? null : v;
      },
      async set(k, v) {
        await B.set(k, v);
      },
      async delete(k) {
        await B.delete(k);
      },
    };
  } catch (e) {
    // DEV fallback (netlify dev)
    return {
      async get(k) {
        return MEM.has(k) ? MEM.get(k) : null;
      },
      async set(k, v) {
        MEM.set(k, v);
      },
      async delete(k) {
        MEM.delete(k);
      },
    };
  }
}