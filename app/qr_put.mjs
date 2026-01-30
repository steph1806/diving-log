import { getStore } from "@netlify/blobs";

function makeId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += alphabet[(Math.random() * alphabet.length) | 0];
  return s;
}

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await req.text();
    if (!body || body.length < 2) {
      return new Response(JSON.stringify({ ok: false, error: "empty body" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const store = getStore("qr");
    const id = makeId();
    await store.set(id, JSON.stringify({ createdAt: Date.now(), body }));

    return new Response(JSON.stringify({ ok: true, id }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
