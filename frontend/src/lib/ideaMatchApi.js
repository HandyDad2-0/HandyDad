// Client for the Describe Your Idea match endpoint (Nicholas's backend half).
//
// The response shape below is the one proposed to Nicholas on 2026-11-03 and
// is NOT final until he confirms it. Everything that depends on the shape is
// in this file so a change stays in one place.
//
//   POST /api/ideas/match   { description }
//   200 { description, matches: [{ projectId, matchPercent, reason }], noMatch }
//   400 { code: "INVALID_DESCRIPTION", message }

export const MAX_DESCRIPTION_LENGTH = 500;

// Thrown when the endpoint isn't there yet (404/501/network), so the screen
// can say "not available" instead of showing an error that looks like the
// user's fault.
export class IdeaSearchUnavailable extends Error {}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Turn a raw 200 body into what the screen renders. `lookup(projectId)` returns
// the seed project or null. Matches for projects we don't know are dropped
// rather than shown half-empty; percentages are clamped to a whole 0-100.
export function normalizeMatches(body, lookup) {
  if (!body || !Array.isArray(body.matches)) {
    throw new Error("Idea search came back in an unexpected format.");
  }
  const matches = body.matches
    .map((m) => {
      const project = lookup(m?.projectId);
      const pct = Number(m?.matchPercent);
      if (!project || !Number.isFinite(pct)) return null;
      return {
        project,
        matchPercent: Math.max(0, Math.min(100, Math.round(pct))),
        reason: typeof m.reason === "string" ? m.reason : "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchPercent - a.matchPercent);
  // No usable matches always means the "no match" path, even if the server
  // forgot to set noMatch.
  return { matches, noMatch: body.noMatch === true || matches.length === 0 };
}

// Resolves to { matches, noMatch }. Throws IdeaSearchUnavailable or Error
// with a message that can be shown to the user directly.
export async function matchIdea(description, lookup) {
  let res;
  try {
    res = await fetch("/api/ideas/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
  } catch {
    throw new IdeaSearchUnavailable("Couldn't reach HandyDad's server. Check that the backend is running and try again.");
  }
  const body = await readJson(res);
  if (res.status === 404 || res.status === 501) {
    throw new IdeaSearchUnavailable("It isn't ready yet. You can still browse the project library.");
  }
  if (!res.ok) {
    throw new Error(body?.message ?? `Idea search failed (HTTP ${res.status}).`);
  }
  return normalizeMatches(body, lookup);
}
