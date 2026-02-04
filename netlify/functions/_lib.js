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
      const v = await s.get(k, { type: "text" });
      return v == null ? null : v;
    },
    async set(k, v) { await s.set(k, v); },
    async delete(k) { await s.delete(k); },
  };
}

export async function store() {
  try {
    return blobsStore();
  } catch (e) {
    console.log("[STORE_FALLBACK_MEM]", String(e && e.message ? e.message : e));
    return memStore();
  }
}