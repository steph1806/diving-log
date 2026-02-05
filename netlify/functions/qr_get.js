import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const id = event.queryStringParameters?.id;
    if (!id) {
      return { statusCode: 400, body: "Missing id" };
    }

    const store = getStore("qr-pages");
    const value = await store.get(id);

    if (!value) {
      return { statusCode: 404, body: "Not found" };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, body: JSON.parse(value) })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: e.message || String(e) })
    };
  }
};