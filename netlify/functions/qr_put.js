// netlify/functions/qr_put.js
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
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" });
    }

    const body = event.body ? JSON.parse(event.body) : null;
    const centerid = body && body.centerid;
    const boat = body && body.boat;
    const payload = body && body.payload;

    if (!centerid || !boat || !payload) {
      return json(400, { ok: false, error: "missing centerid / boat / payload" });
    }

    // IMPORTANT: init store INSIDE handler (avoid MissingBlobsEnvironmentError)
    const store = getStore("qr-store");

    // Unique id used by the app URL (#import=id)
    const id = `${centerid}_${boat}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    // Store RAW JSON STRING that your app expects to re-import
    const raw = JSON.stringify(payload);

    await store.set(id, raw);

    return json(200, { ok: true, id });
  } catch (e) {
    return json(500, { ok: false, error: String(e && e.message ? e.message : e) });
  }
};