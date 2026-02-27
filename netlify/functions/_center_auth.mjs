import { getStore } from "@netlify/blobs";

// Retourne { ok:true, centerId, centerRec } OU { ok:false, status, error }
export async function requireValidCenterByKey(centerKey) {
  const store = getStore("qr");

  const keyRaw = await store.get(`centerKeys/${centerKey}`);
  if (!keyRaw) return { ok: false, status: 404, error: "unknown_centerKey" };

  const keyRec = JSON.parse(keyRaw);
  if (keyRec.status !== "active") return { ok: false, status: 403, error: "centerKey_disabled" };

  const centerRaw = await store.get(`centers/${keyRec.centerId}`);
  if (!centerRaw) return { ok: false, status: 404, error: "center_not_found" };

  const centerRec = JSON.parse(centerRaw);

  if (!["active", "trial"].includes(centerRec.status)) {
    return { ok: false, status: 403, error: "center_disabled" };
  }

  if (
    centerRec.status === "trial" &&
    centerRec.trialEndsAt &&
    Date.now() > new Date(centerRec.trialEndsAt).getTime()
  ) {
    return { ok: false, status: 403, error: "trial_expired" };
  }

  if (centerRec.allowNewJoin === false) {
    return { ok: false, status: 403, error: "join_blocked" };
  }

  return { ok: true, centerId: centerRec.centerId, centerRec };
}