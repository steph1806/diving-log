let LAST_PAYLOAD = null;

export async function handler(event) {
  // --- POST : dépôt ---
  if (event.httpMethod === "POST") {
    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: "Invalid JSON" };
    }

    // Validation contractuelle minimale
    if (
      !payload ||
      payload.schema !== "divinglog_library_export_v1" ||
      !Array.isArray(payload.diverLibrary)
    ) {
      return { statusCode: 400, body: "Invalid schema" };
    }

    LAST_PAYLOAD = payload;

    return { statusCode: 200, body: "OK" };
  }

  // --- GET : consommation ---
  if (event.httpMethod === "GET") {
    if (!LAST_PAYLOAD) {
      return { statusCode: 204 }; // rien à consommer
    }

    const payload = LAST_PAYLOAD;
    LAST_PAYLOAD = null; // consume-once

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
}