// netlify/functions/_lib.js
import crypto from "crypto";
import { getStore } from "@netlify/blobs";

export const STORE_NAME = "ocean_infinity_centers_v1";

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
  // short-ish, URL-safe
  return (
    prefix +
    "_" +
    crypto.randomBytes(9).toString("base64url") // ~12 chars
  );
}

export function hashSecret(secret) {
  // simple SHA-256 hash (suffisant ici)
  return crypto.createHash("sha256").update(secret, "utf8").digest("hex");
}

export async function store() {
  // Netlify Blobs store
  return getStore({ name: STORE_NAME });
}