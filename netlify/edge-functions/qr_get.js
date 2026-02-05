import { getStore } from "@netlify/blobs";

export default async (request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const store = getStore("qr-pages");
  const data = await store.get(id);

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({ ok: true, body: data });
};