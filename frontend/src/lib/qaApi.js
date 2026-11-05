// Client for POST /api/qa/questions (see docs/qa-api-interface.md).
//
// Today the backend is a stub that answers HTTP 501 QA_NOT_IMPLEMENTED. The
// docs say the UI must show `message` as an "unavailable" state and never
// present `answer` as advice. The 200 success schema is not agreed yet, so a
// 200 is returned to the caller as-is for the panel to show defensively.

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Resolves to { status: "unavailable", message }
//           | { status: "answered", answer, sources }
// Throws Error (message safe to show) for bad input, unknown project or a
// network failure.
export async function askQuestion({ projectId, question }) {
  let res;
  try {
    res = await fetch("/api/qa/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, question }),
    });
  } catch {
    throw new Error("Couldn't reach HandyDad's server. Check that the backend is running and try again.");
  }
  const body = await readJson(res);
  if (res.status === 501) {
    return {
      status: "unavailable",
      message: body?.message ?? "Build question answers are not available yet.",
    };
  }
  if (res.ok && typeof body?.answer === "string" && body.answer.trim()) {
    return { status: "answered", answer: body.answer, sources: Array.isArray(body.sources) ? body.sources : [] };
  }
  if (res.ok) {
    return { status: "unavailable", message: "HandyDad doesn't have an answer to that yet." };
  }
  throw new Error(body?.message ?? `Couldn't send your question (HTTP ${res.status}).`);
}
