// netlify/functions/_lib.js
import crypto from "crypto";

export const STORE_NAME = "ocean_infinity_centers_v1";

// In-memory fallback (used when blobs fail)
const MEM = new Map();

function memStore() {
  return {
    async get(k) { return MEM.has(k) ? MEM.get(k) : null; },
    async set(k, v) { MEM.set(k, v); },
    async delete(k) { MEM.delete(k); },
  };
}

// --- IDs / hashing / normalization (REQUIRED by center_* functions)

export function makeId(prefix = "") {
  // 12 bytes => 24 hex chars
  return `${prefix}${crypto.randomBytes(12).toString("hex")}`;
}

export function hashSecret(secret) {
  return crypto.createHash("sha256").update(String(secret || ""), "utf8").digest("hex");
}

export function normalizeBoatsN(v) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = 1;
  n = Math.round(n);
  if (n < 1) n = 1;
  if (n > 40) n = 40; // hard cap (safe)
  return n;
}

// --- Netlify Blobs store (prod)

async function getBlobsStore() {
  const mod = await import("@netlify/blobs");
  const getStore = mod && mod.getStore;
  if (typeof getStore !== "function") throw new Error("blobs_getStore_missing");
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

// NOTE: center_* code does: const s = await store();
// so store() MUST be async.
export async function store() {
  return blobsStore();
}

// --- HTTP helpers

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