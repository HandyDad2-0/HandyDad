// Client for Razee's Monthly Build Challenge API (backend/server.js,
// documented in docs/monthly-build-challenge-backend.md).
//
// Vote de-duplication: there is no login yet, so the server enforces one
// vote per submission per `voterId`. We generate a random id once, keep it
// in localStorage, and send it with every vote. We also remember which
// submissions this browser has voted on so the button stays disabled after
// a reload (the server never sends back who voted for what).

const VOTER_ID_KEY = "handydad_voter_id";
const VOTED_IDS_KEY = "handydad_challenge_voted_ids";

let fallbackVoterId = null; // used only if localStorage is unavailable

export function getVoterId() {
  try {
    let id = window.localStorage.getItem(VOTER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(VOTER_ID_KEY, id);
    }
    return id;
  } catch {
    fallbackVoterId ??= crypto.randomUUID();
    return fallbackVoterId;
  }
}

export function getVotedIds() {
  try {
    const raw = window.localStorage.getItem(VOTED_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function rememberVoted(submissionId, votedIds) {
  const next = new Set(votedIds);
  next.add(submissionId);
  try {
    window.localStorage.setItem(VOTED_IDS_KEY, JSON.stringify([...next]));
  } catch {
    // Storage unavailable: the vote still counted on the server, it just
    // won't be remembered across reloads in this browser.
  }
  return next;
}

export function rankSubmissions(submissions) {
  return [...submissions].sort((a, b) => b.votes - a.votes);
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// GET /api/challenge -> { monthLabel, votingClosesLabel, votingClosesAt, submissions }
export async function fetchChallenge() {
  const res = await fetch("/api/challenge");
  if (!res.ok) throw new Error(`Could not load the challenge (HTTP ${res.status}).`);
  return res.json();
}

// POST /api/challenge/submissions -> { submission, challenge }
export async function submitBuild({ title, builderName }) {
  const res = await fetch("/api/challenge/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, builderName }),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body?.error ?? `Could not submit your build (HTTP ${res.status}).`);
  return body;
}

// POST /api/challenge/submissions/:id/vote
// Resolves to { ok: true, submission } or { ok: false, reason, submission }.
// reason is "already_voted" (409), "not_found" (404) or "missing_voter_id" (400).
export async function voteForSubmission(submissionId) {
  const res = await fetch(`/api/challenge/submissions/${encodeURIComponent(submissionId)}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voterId: getVoterId() }),
  });
  const body = await readJson(res);
  if (res.ok) return { ok: true, submission: body.submission };
  if (body?.error) return { ok: false, reason: body.error, submission: body.submission ?? null };
  throw new Error(`Could not record your vote (HTTP ${res.status}).`);
}
