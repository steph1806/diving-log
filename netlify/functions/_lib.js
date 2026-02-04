// netlify/functions/_lib.js
import crypto from "crypto";


export const STORE_NAME = "ocean_infinity_centers_v1";

// In-memory fallback (local/dev only)
const MEM = new Map();

function memStore() {
  return {
    async get(k) { return MEM.has(k) ? MEM.get(k) : null; },
    async set(k, v) { MEM.set(k, v); },
    async delete(k) { MEM.delete(k); },
  };
}

// Blobs-backed store (prod)
async function getBlobsStore() {
  const mod = await import("@netlify/blobs"); // <-- si ça manque, on catch au runtime
  const getStore = mod.getStore || mod.getStore?.default || mod.getStore;
  if (!getStore) throw new Error("blobs_getStore_missing");
  return getStore(STORE_NAME);
}

function blobsStore() {
  return {
    async get(k) {
      try {
        const s = await getBlobsStore();
        const v = await s.get(k, { type: "text" });
        return v == null ? null : v;
      } catch (e) {
        console.log("[BLOBS_GET_FAIL]", e?.message || String(e));
        return MEM.get(k) ?? null;
      }
    },
    async set(k, v) {
      try {
        const s = await getBlobsStore();
        await s.set(k, v);
      } catch (e) {
        console.log("[BLOBS_SET_FAIL]", e?.message || String(e));
        MEM.set(k, v);
      }
    },
    async delete(k) {
      try {
        const s = await getBlobsStore();
        await s.delete(k);
      } catch (e) {
        console.log("[BLOBS_DEL_FAIL]", e?.message || String(e));
        MEM.delete(k);
      }
    },
  };
}

export function store() {
  return blobsStore();
}


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