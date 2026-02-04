// netlify/functions/_lib.js
import crypto from "crypto";
import { getStore as getBlobStore } from "@netlify/blobs";

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
function blobsStore() {
  const s = getBlobStore(STORE_NAME);

  return {
    async get(k) {
      try {
        const v = await s.get(k, { type: "text" });
        return v == null ? null : v;
      } catch (e) {
        console.log("[BLOBS_GET_FAIL]", e?.message || e);
        return MEM.get(k) ?? null;
      }
    },

    async set(k, v) {
      try {
        await s.set(k, v);
      } catch (e) {
        console.log("[BLOBS_SET_FAIL]", e?.message || e);
        MEM.set(k, v);
      }
    },

    async delete(k) {
      try {
        await s.delete(k);
      } catch (e) {
        console.log("[BLOBS_DEL_FAIL]", e?.message || e);
        MEM.delete(k);
      }
    },
  };
}

export function store() {
  return blobsStore(); // PLUS DE try/catch ICI
}