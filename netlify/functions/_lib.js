// netlify/functions/_lib.js
import crypto from "crypto";

/*
  In-memory registry.
  NOTE:
  - Persistance par instance (acceptable pour JOIN flow)
  - Reset possible à froid (clé régénérable)
*/

const CENTERS = new Map();

/* =========================
   HTTP helpers
========================= */

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

/* =========================
   Utils
========================= */

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

/* =========================
   Registry API
========================= */

export function createCenter({ centerId, name, boatsN, adminHash }) {
  CENTERS.set(centerId, {
    centerId,
    name,
    boatsN,
    adminHash,
    createdAt: Date.now(),
    disabled: false,
  });
}

export function getCenter(centerId) {
  return CENTERS.get(centerId) || null;
}

export function findCenterByAdminHash(adminHash) {
  for (const c of CENTERS.values()) {
    if (c.adminHash === adminHash) return c;
  }
  return null;
}

export function disableCenter(centerId) {
  const c = CENTERS.get(centerId);
  if (c) c.disabled = true;
}