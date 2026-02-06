// netlify/functions/center_key_get.mjs
import { getStore } from "@netlify/blobs";

function bad(statusCode, msg) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: msg }) };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return bad(405, "method_not_allowed");

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return bad(400, "invalid_json"); }

  const centerId = (body.centerId || "").trim();
  if (!centerId) return bad(400, "missing_centerId");

  const store = getStore("ocean-infinity");
  const centerRec = await store.getJSON(`centers/${centerId}`);
  if (!centerRec) return bad(404, "center_not_found");
  if (centerRec.status !== "active") return bad(403, "center_disabled");

  const centerKey = centerRec.centerKeyActive;
  if (!centerKey) return bad(404, "centerKey_missing");

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ centerKey }),
  };
};