import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    if (!event.body) {
      return { statusCode: 400, body: "Missing body" };
    }

    const payload = JSON.parse(event.body);

    // id simple, court, URL-safe
    const id = Math.random().toString(36).slice(2, 10);

    const store = getStore("qr-pages");
    await store.set(id, JSON.stringify(payload), {
      metadata: { createdAt: new Date().toISOString() }
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, id })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: e.message || String(e) })
    };
  }
};