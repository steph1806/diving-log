// netlify/functions/center_create.js
import { badRequest, json, makeId, methodNotAllowed, normalizeBoatsN, hashSecret, store } from "./_lib.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed();

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return badRequest("invalid_json"); }

  const name = String(body.name || "").trim();
  if (!name) return badRequest("missing_name");

  const boatsN = normalizeBoatsN(body.boatsN);

  const centerId = makeId("C");
  const joinKey  = "OI1_" + makeId("J").slice(2); // OI1_<random>
  const adminSecret = "A_" + makeId("S").slice(2);

  const rec = {
    centerId,
    name,
    boatsN,
    status: "active",
    adminSecretHash: hashSecret(adminSecret),
    joinKey,          // clé active actuelle
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const s = await store();
  // 1) center record
  await s.set(`center:${centerId}`, JSON.stringify(rec));
  // 2) reverse lookup joinKey -> centerId
  await s.set(`key:${joinKey}`, JSON.stringify({ centerId, status: "active", issuedAt: rec.createdAt }));

  return json(200, {
    ok: true,
    center: { centerId, name, boatsN, status: rec.status },
    adminSecret,
  });
}