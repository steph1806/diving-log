// netlify/functions/center_join.js
import { badRequest, json, methodNotAllowed, store } from "./_lib.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed();

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return badRequest("invalid_json"); }

  const joinKey = String(body.joinKey || "").trim();
  if (!joinKey) return badRequest("missing_key");

  const s = await store();

  const keyRecRaw = await s.get(`key:${joinKey}`);
  if (!keyRecRaw) return json(200, { ok: false, error: "invalid_key" });

  let keyRec;
  try { keyRec = JSON.parse(keyRecRaw); }
  catch { return json(200, { ok: false, error: "invalid_key" }); }

  const centerRaw = await s.get(`center:${keyRec.centerId}`);
  if (!centerRaw) return json(200, { ok: false, error: "invalid_key" });

  let center;
  try { center = JSON.parse(centerRaw); }
  catch { return json(200, { ok: false, error: "invalid_key" }); }

  if (center.status !== "active") {
    return json(200, { ok: false, error: "center_disabled" });
  }

  return json(200, {
    ok: true,
    center: { centerId: center.centerId, name: center.name, boatsN: center.boatsN, status: center.status },
  });
}