import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const params = event.queryStringParameters || {};
    const { centerid, boat } = params;

    if (!centerid || !boat) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "missing centerid / boat" }),
      };
    }

    const store = getStore("qr-store");
    const key = `${centerid}/boat_${boat}`;

    const data = await store.get(key);

    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "not found" }),
      };
    }

    return {
      statusCode: 200,
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}