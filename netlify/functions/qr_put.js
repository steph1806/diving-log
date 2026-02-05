import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const { centerid, boat, payload } = body;

    if (!centerid || !boat || !payload) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "missing centerid / boat / payload" }),
      };
    }

    const store = getStore("qr-store");
    const key = `${centerid}/boat_${boat}`;

    await store.set(key, JSON.stringify(payload));

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, key }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}