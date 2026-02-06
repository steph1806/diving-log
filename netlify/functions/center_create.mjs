// netlify/functions/center_create.mjs
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

function nowIso() { return new Date().toISOString(); }

function makeCenterId() {
  // stable-ish, opaque
  return "c_" + crypto.randomBytes(12).toString("hex");
}

function makeCenterKey() {
  // shareable secret, readable enough
  // ex: OI-XXXX-XXXX-XXXX (base32-ish)
  const raw = crypto.randomBytes(16).toString("hex").toUpperCase();
  return `OI-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}`;
}

function bad(statusCode, msg) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: msg }) };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return bad(405, "method_not_allowed");

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return bad(400, "invalid_json"); }

  const name = (body.name || "").trim();
  const boatsN = Number.isFinite(body.boatsN) ? body.boatsN : Number(body.boatsN);

  if (!name) return bad(400, "missing_name");
  if (!Number.isInteger(boatsN) || boatsN < 1 || boatsN > 20) return bad(400, "invalid_boatsN");

  const store = getStore("ocean-infinity"); // Blobs store  [oai_citation:1‡Netlify Docs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/?utm_source=chatgpt.com)

  const centerId = makeCenterId();
  const centerKey = makeCenterKey();
  const t = nowIso();

  const centerRecord = {
    centerId,
    centerName: name,
    boatsN,
    status: "active",
    createdAt: t,
    updatedAt: t,
  };

  const centerKeyRecord = {
    centerKey,
    centerId,
    status: "active",
    createdAt: t,
  };

  // Persist
  await store.setJSON(`centers/${centerId}`, centerRecord);
  await store.setJSON(`centerKeys/${centerKey}`, centerKeyRecord);

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ centerId, centerName: name, boatsN, centerKey }),
  };
};