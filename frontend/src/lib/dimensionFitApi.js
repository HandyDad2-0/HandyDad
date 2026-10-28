// Client for the Dimension-Fit API (backend/server.js, backend/lib/dimensionFitHandler.js).
// The rules engine itself now lives only in backend/dimension-fit-engine.js —
// this module is a thin HTTP client, not a second copy of the logic.

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// POST /api/dimension-fit -> { flags, hasBlockingFlags }
// Throws on network failure, a non-2xx response, or a malformed body, with a
// message good enough to show the user directly.
export async function checkDimensionFit({ projectId, length_ft, width_ft, clearance_ft, entered_height_ft, obstacles }) {
  const res = await fetch("/api/dimension-fit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, length_ft, width_ft, clearance_ft, entered_height_ft, obstacles }),
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new Error(body?.message ?? `Could not check your space (HTTP ${res.status}).`);
  }
  if (!body || !Array.isArray(body.flags)) {
    throw new Error("The space check came back in an unexpected format.");
  }
  return body;
}
