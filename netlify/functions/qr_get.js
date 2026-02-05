// netlify/functions/qr_get.js
const { getStore } = require("@netlify/blobs");

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return json(405, { ok: false, error: "method_not_allowed" });
    }

    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) return json(400, { ok: false, error: "missing id" });

    // IMPORTANT: init store INSIDE handler (avoid MissingBlobsEnvironmentError)
    const store = getStore("qr-store");

    const data = await store.get(id);
    if (!data) return json(404, { ok: false, error: "not_found" });

    // Return exactly what your index expects
    return json(200, { ok: true, body: data });
  } catch (e) {
    return json(500, { ok: false, error: String(e && e.message ? e.message : e) });
  }
};