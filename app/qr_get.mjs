import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: "missing id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const store = getStore("qr");
    const raw = await store.get(id);

    if (!raw) {
      return new Response(JSON.stringify({ ok: false, error: "not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const obj = JSON.parse(raw);
    return new Response(JSON.stringify({ ok: true, body: obj.body }), {
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
