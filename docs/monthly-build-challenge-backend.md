# Monthly Build Challenge — Backend

Owner: Razee Nepal

Scope notes for the Sprint 1 card "Monthly Build Challenge — Backend (submissions, votes, leaderboard logic)." This is **backend only** — submission storage, server-side vote counting, and monthly reset. The voting UI and leaderboard display are Shaket's frontend card.

## Why this exists

Shaket's frontend (`frontend/src/screens/MonthlyChallenge.jsx`) was built against a mock — `frontend/src/data/challengeSubmissions.js` and `frontend/src/lib/challenge.js`, both explicitly commented as temporary stand-ins for this API. Two real problems with the mock that this backend fixes:

1. **Submissions aren't stored anywhere real** — they only live in React state, gone on refresh.
2. **Votes are counted client-side via `localStorage`** — one vote per *browser*, not per person, and easy to reset by clearing site data. Real vote integrity needs to live on the server.

## API

Base path `/api/challenge`, run via `npm start` in `backend/` (defaults to port 3001, override with `PORT`).

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/challenge` | — | `{ monthLabel, votingClosesLabel, votingClosesAt, submissions[] }` |
| POST | `/api/challenge/submissions` | `{ title, builderName }` | `201 { submission, challenge }` |
| POST | `/api/challenge/submissions/:id/vote` | `{ voterId }` | `200 { submission }` on success; `409 already_voted` / `404 not_found` / `400 missing_voter_id` on failure |
| GET | `/api/challenge/archive` | — | `{ archive: [{ monthLabel, submissions, winner, closedAt }] }` |

Each submission is `{ id, title, builderName, votes, photoLabel }` — the exact shape `challengeSubmissions.js` already uses, so swapping the mock for real fetch calls shouldn't require changing the screen components themselves (per the comments Shaket already left in that file).

## Voting: `voterId`

There's no login system yet, so vote de-duplication needs a stand-in for "who is voting." The client is expected to generate a random id once (`crypto.randomUUID()`), persist it in `localStorage`, and send it as `voterId` on every vote — the server then enforces one vote per `voterId` per submission. This is stronger than the current pure-`localStorage` vote-count approach (the server is now the source of truth for the count itself), but it's still not fraud-proof — a cleared browser can vote again. Real per-account enforcement needs actual auth, which doesn't exist yet; flagged here rather than silently pretending this is solved.

## Monthly reset

There's no cron job. Instead, every read/write checks whether the current time is past `votingClosesAt` (23:59:59 on the last day of the active month) and, if so, archives the closed month — recording every submission and the highest-voted winner — then starts a fresh month with an empty submission list. This means the reset actually happens on the *first request after* the month closes, not at the exact instant it closes, which is fine for this use case (nobody's expecting sub-second precision on a monthly leaderboard).

## Storage

`data/challenge-state.json`, a flat JSON file (gitignored — it's generated at runtime, not seed content), following the same "plain file now, real DB later" approach as `data/seed-projects.json`. Swapping to a real database later only touches `lib/challengeStore.js`; the API contract above doesn't need to change.

## Tests

`backend/test/challengeStore.test.js` (`npm test` in `backend/`) covers: empty initial state, adding a submission, voting, rejecting a duplicate vote from the same `voterId`, voting on a submission that doesn't exist, and — the one most worth having a test for — that closing out a month archives it with the correct winner and starts a clean slate. All 6 pass.

## What's NOT done here (out of scope for this card)

- **Wiring the frontend to call this API.** That's the separate, currently-unassigned Backlog card "Backend/API integration layer — connect frontend to materials/dimension-fit/schema modules." `challengeSubmissions.js` and `lib/challenge.js` still use the mock as of this writing; swapping them for `fetch("/api/challenge")` calls is that integration card's job, not this one's.
- **Photo upload.** The frontend's submit form already says "Photo upload isn't wired up yet" — this backend doesn't add it either. `photoLabel` stays a placeholder string.
- **Real authentication for vote fraud prevention** — see the `voterId` caveat above.
