import { getStore } from "@netlify/blobs";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const id = crypto.randomUUID().slice(0, 8); // court, URL-safe
  const store = getStore("qr-pages");

  await store.set(id, payload, {
    metadata: { createdAt: new Date().toISOString() }
  });

  return Response.json({ ok: true, id });
};