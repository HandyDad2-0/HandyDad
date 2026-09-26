// Monthly Build Challenge helpers — voting and leaderboard ordering.
//
// TEMPORARY: this is all in-memory/localStorage logic standing in for
// Razee's real backend (submission storage, vote counting, monthly reset).
// Kept as small pure functions with a stable shape so swapping in real API
// calls later shouldn't require the screens themselves to change.

const VOTED_STORAGE_KEY = "handydad_challenge_voted_ids";

export function sortByVotes(submissions) {
  return [...submissions].sort((a, b) => b.votes - a.votes);
}

export function castVote(submissions, submissionId) {
  return submissions.map((s) =>
    s.id === submissionId ? { ...s, votes: s.votes + 1 } : s
  );
}

// One-vote-per-submission-per-browser guard. Real vote-fraud prevention
// (per-account, server-enforced) is Razee's backend's job — this is just
// enough to make the frontend behave sensibly on its own for now.
export function getVotedIds() {
  try {
    const raw = window.localStorage.getItem(VOTED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markVoted(submissionId, votedIds) {
  const next = new Set(votedIds);
  next.add(submissionId);
  try {
    window.localStorage.setItem(VOTED_STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // localStorage unavailable (private browsing, etc.) — vote still counts
    // for this session, it just won't be remembered on reload.
  }
  return next;
}
