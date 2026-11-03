# Monthly Build Challenge — Backend

Owner: Razee Nepal

Scope notes for two cards. Sprint 1: "Monthly Build Challenge — Backend (submissions, votes, leaderboard logic)", which built submission storage, server-side vote counting, and the monthly reset. Sprint 2: "Persist challenge data and harden voting", covered under [Persistence and hardening](#persistence-and-hardening) below. This is **backend only**; the voting UI and leaderboard display are Shaket's frontend cards.

## Why this exists

Shaket's frontend (`frontend/src/screens/MonthlyChallenge.jsx`) was first built against a mock, explicitly a temporary stand-in for this API, and now calls it through `frontend/src/lib/challengeApi.js`. Two real problems with the mock that this backend fixed:

1. **Submissions aren't stored anywhere real** — they only live in React state, gone on refresh.
2. **Votes are counted client-side via `localStorage`** — one vote per *browser*, not per person, and easy to reset by clearing site data. Real vote integrity needs to live on the server.

## API

Base path `/api/challenge`, run via `npm start` in `backend/` (defaults to port 3001, override with `PORT`).

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/challenge` | — | `{ monthLabel, votingClosesLabel, votingClosesAt, submissions[] }` |
| POST | `/api/challenge/submissions` | `{ title, builderName }` | `201 { submission, challenge }`; `400 { error, code }` for a bad title or name, `409` when the month is full, `429` when one IP submits too often |
| POST | `/api/challenge/submissions/:id/vote` | `{ voterId }` | `200 { submission }` on success; `409 already_voted` / `404 not_found` / `400 missing_voter_id` / `400 invalid_voter_id` / `429 rate_limited` on failure |
| GET | `/api/challenge/archive` | — | `{ archive: [{ monthLabel, submissions, winner, closedAt }] }` |

Each submission is `{ id, title, builderName, votes, photoLabel }` — the exact shape `challengeSubmissions.js` already uses, so swapping the mock for real fetch calls shouldn't require changing the screen components themselves (per the comments Shaket already left in that file).

## Voting: `voterId`

There's no login system yet, so vote de-duplication needs a stand-in for "who is voting." The client generates a random id once (`crypto.randomUUID()`), persists it in `localStorage`, and sends it as `voterId` on every vote. The server enforces one vote per `voterId` per submission and is the source of truth for the count. This is still not fraud-proof: a cleared browser gets a new `voterId` and can vote again. The IP rate limit below slows scripted abuse but doesn't stop a determined person. Real per-account enforcement needs actual auth, which doesn't exist yet; flagged here rather than pretending this is solved.

## Monthly reset

There's no cron job. Instead, every read/write checks whether the current time is past `votingClosesAt` (23:59:59 on the last day of the active month) and, if so, archives the closed month — recording every submission and the highest-voted winner — then starts a fresh month with an empty submission list. This means the reset actually happens on the *first request after* the month closes, not at the exact instant it closes, which is fine for this use case (nobody's expecting sub-second precision on a monthly leaderboard).

## Persistence and hardening

State is a flat JSON file, `backend/data/challenge-state.json` by default (gitignored, since it's runtime data rather than seed content), or whatever path the `CHALLENGE_STATE_PATH` environment variable names. Point that at a persistent disk when deploying, otherwise a redeploy that replaces the container also replaces the data. This is the same "plain file now, real DB later" approach as `data/seed-projects.json`; moving to a database later only touches `lib/challengeStore.js`, and the API above doesn't change.

What the Sprint 2 card added on top of that:

**Crash safety**
- Writes go to a temp file, are fsynced, then renamed over the real file, so a crash mid-write can't leave a half-written state.
- The previous good state is kept as `challenge-state.json.bak`.
- If the state file is unreadable or has the wrong shape, it is moved aside as `challenge-state.json.corrupt-<timestamp>` (never deleted), the backup is restored, and if there is no usable backup a fresh month starts. The server no longer crashes on a bad file.

**Vote integrity**
- Each submission's `votes` is derived from its list of distinct voter ids, so the counter and the list can't drift apart. A hand-edited or duplicated entry is corrected on the next load.
- `voterId` must be a string of 1 to 64 letters, digits, `_` or `-` (a `randomUUID()` fits). Anything else is `400 invalid_voter_id`, which also stops a client from bloating the state file with junk ids.

**Abuse limits**
- Per-IP rate limits: 30 votes per 10 minutes and 5 submissions per hour. A real person voting on every submission in a month stays well inside them. Blocked requests get `429` with a `Retry-After` header and are not counted. The limiter is in memory, so it resets on restart and isn't shared between processes.
- Titles are limited to 100 characters and names to 60, both trimmed. A month accepts at most 100 submissions.
- JSON bodies are capped at 10 KB. Malformed or oversized bodies get a JSON `400 invalid_json` / `413 payload_too_large` instead of Express's HTML error page.

**Constraints to know about**
- One server process only. The store is synchronous, which is what makes read-modify-write safe; two processes sharing one file would not be.
- Behind a reverse proxy, set Express's `trust proxy` setting, otherwise every user shares the proxy's IP and therefore one rate-limit bucket.

## Tests

`npm test` in `backend/` runs everything. The challenge tests are:

- `test/challengeStore.test.js` (Sprint 1): empty initial state, adding a submission, voting, rejecting a duplicate vote, voting on a missing submission, and that closing a month archives it with the correct winner and starts a clean slate.
- `test/challengeHardening.test.js` (Sprint 2): temp-file and backup handling, recovery from a corrupt or wrong-shaped state file, vote counts derived from voter lists, `voterId` validation, input limits and the monthly submission cap, the rate limiter (including recovery after the window), and the HTTP behaviour for bad JSON, oversized bodies, vote status codes, and 429s. These run against a temporary state file and never touch real data.

## What's NOT done here

- **Photo upload.** The frontend's submit form says "Photo upload isn't wired up yet", and this backend doesn't add it either. `photoLabel` stays a placeholder string.
- **Real authentication.** See the `voterId` caveat above.
- **A real database.** The JSON file is fine for one process and a small monthly leaderboard. A database becomes worth it if the backend is ever run as more than one process or the data needs querying.
