// netlify/functions/center_key_get.js
import { badRequest, json, methodNotAllowed, store, hashSecret } from "./_lib.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed();

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return badRequest("invalid_json"); }

  const centerId = String(body.centerId || "").trim();
  const adminSecret = String(body.adminSecret || "").trim();
  if (!centerId) return badRequest("missing_centerId");
  if (!adminSecret) return badRequest("missing_adminSecret");

  const s = await store();
  const centerRaw = await s.get(`center:${centerId}`);
  if (!centerRaw) return json(200, { ok: false, error: "unauthorized" });

  let center;
  try { center = JSON.parse(centerRaw); }
  catch { return json(200, { ok: false, error: "unauthorized" }); }

  if (center.status !== "active") {
    return json(200, { ok: false, error: "center_disabled" });
  }

  if (center.adminSecretHash !== hashSecret(adminSecret)) {
    return json(200, { ok: false, error: "unauthorized" });
  }

  return json(200, { ok: true, joinKey: center.joinKey });
}