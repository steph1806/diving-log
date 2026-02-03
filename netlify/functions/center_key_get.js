// netlify/functions/center_key_get.js
import { badRequest, json, methodNotAllowed, store, hashSecret } from "./_lib.js";

export async function handler(event) {
console.log("[KEY_GET][ENTRY]", {
  method: event.httpMethod,
  body: event.body
});
  if (event.httpMethod !== "POST") return methodNotAllowed();

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return badRequest("invalid_json"); }

  const centerId = String(body.centerId || "").trim();
  const adminSecret = String(body.adminSecret || "").trim();
  console.log("[KEY_GET][INPUT]", {
  centerId,
  adminSecret_len: String(adminSecret || "").length
});
  if (!centerId) return badRequest("missing_centerId");
 // if (!adminSecret) return badRequest("missing_adminSecret");

  const s = await store();
  const centerRaw = await s.get(`center:${centerId}`);
if (!centerRaw) {
  console.log("[KEY_GET][UNAUTHORIZED]", { centerId, reason: "center_missing" });
  return json(200, { ok:false, error:"unauthorized_center_missing" });
}

  let center;
  try { center = JSON.parse(centerRaw); }
catch {
  console.log("[KEY_GET][UNAUTHORIZED]", { centerId, reason: "center_json_parse_failed" });
  return json(200, { ok:false, error:"unauthorized_bad_secret" });
}

console.log("[KEY_GET][HASH_DEBUG]", {
  inputHash: hashSecret(adminSecret),
  storedHash: center.adminSecretHash
});


  if (center.status !== "active") {
    return json(200, { ok: false, error: "center_disabled" });
  }

// if (center.adminSecretHash !== hashSecret(adminSecret)) {
//  console.log("[KEY_GET][UNAUTHORIZED]", {
//    centerId,
//    reason: "secret_mismatch",
//   storedHash_present: !!center.adminSecretHash
//  });
//  return json(200, { ok:false, error:"center_disabled" });
// }

  return json(200, { ok: true, Key: center.joinKey });
}