// netlify/functions/center_join.mjs
import { getStore } from "@netlify/blobs";

function bad(statusCode, msg) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: msg }) };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return bad(405, "method_not_allowed");

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return bad(400, "invalid_json"); }

  const centerKey = (body.centerKey || "").trim();
  if (!centerKey) return bad(400, "missing_centerKey");

 const store = getStore("qr");

  const keyRec = await store.getJSON(`centerKeys/${centerKey}`);
  if (!keyRec) return bad(404, "unknown_centerKey");
  if (keyRec.status !== "active") return bad(403, "centerKey_disabled");

  const centerRec = await store.getJSON(`centers/${keyRec.centerId}`);
  if (!centerRec) return bad(404, "center_not_found");
  if (centerRec.status !== "active") return bad(403, "center_disabled");

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      centerId: centerRec.centerId,
      centerName: centerRec.centerName,
      boatsN: centerRec.boatsN,
    }),
  };
};