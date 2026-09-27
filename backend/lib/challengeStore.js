/**
 * Monthly Build Challenge — data store and monthly reset logic.
 * Owner: Razee Nepal
 *
 * Persists to a JSON file (data/challenge-state.json) rather than an
 * in-memory object so submissions/votes survive a server restart — same
 * "flat JSON file, swap for a DB later" approach used by
 * data/seed-projects.json. See docs/monthly-build-challenge-backend.md.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, "..", "data", "challenge-state.json");

function monthLabelFor(date) {
  return `${date.toLocaleString("en-US", { month: "long" })} Build of the Month`;
}

// Voting closes at 23:59:59 on the last day of the given date's month.
function votingClosesAtFor(date) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return lastDay.toISOString();
}

function freshState(now = new Date()) {
  return {
    monthLabel: monthLabelFor(now),
    votingClosesAt: votingClosesAtFor(now),
    submissions: [],
    votes: {}, // { [submissionId]: Set-like array of voterIds who voted for it }
    archive: [], // past months: { monthLabel, submissions, winner, closedAt }
  };
}

function load() {
  if (!fs.existsSync(STATE_PATH)) {
    const state = freshState();
    save(state);
    return state;
  }
  const raw = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
  return raw;
}

function save(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

/**
 * If voting has closed for the currently loaded month, archive it
 * (recording the winner) and start a fresh month. Idempotent — safe to
 * call on every request, which is how the reset actually triggers: there's
 * no cron job, just a check on read/write, same as content-driven resets
 * elsewhere in this project.
 */
function applyMonthlyResetIfNeeded(state, now = new Date()) {
  if (now.toISOString() <= state.votingClosesAt) return state;

  const ranked = [...state.submissions].sort((a, b) => b.votes - a.votes);
  const winner = ranked[0] ?? null;

  state.archive.push({
    monthLabel: state.monthLabel,
    submissions: state.submissions,
    winner,
    closedAt: state.votingClosesAt,
  });

  state.monthLabel = monthLabelFor(now);
  state.votingClosesAt = votingClosesAtFor(now);
  state.submissions = [];
  state.votes = {};

  return state;
}

export function getChallenge(now = new Date()) {
  let state = load();
  state = applyMonthlyResetIfNeeded(state, now);
  save(state);
  return publicView(state);
}

export function addSubmission({ title, builderName }, now = new Date()) {
  let state = load();
  state = applyMonthlyResetIfNeeded(state, now);

  const submission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    builderName,
    votes: 0,
    photoLabel: "[photo]",
  };
  state.submissions.push(submission);
  state.votes[submission.id] = [];

  save(state);
  return { challenge: publicView(state), submission };
}

/**
 * Records one vote for a submission from a given voterId (a random id the
 * client generates once and persists — see frontend integration notes in
 * the design doc). Returns { ok: true, submission } on success, or
 * { ok: false, reason } if the vote can't be counted.
 */
export function castVote(submissionId, voterId, now = new Date()) {
  if (!voterId) return { ok: false, reason: "missing_voter_id" };

  let state = load();
  state = applyMonthlyResetIfNeeded(state, now);

  const submission = state.submissions.find((s) => s.id === submissionId);
  if (!submission) return { ok: false, reason: "not_found" };

  const votersForSubmission = state.votes[submissionId] ?? (state.votes[submissionId] = []);
  if (votersForSubmission.includes(voterId)) {
    return { ok: false, reason: "already_voted", submission };
  }

  votersForSubmission.push(voterId);
  submission.votes += 1;

  save(state);
  return { ok: true, submission };
}

export function getArchive() {
  const state = load();
  return state.archive;
}

function publicView(state) {
  // Never expose the raw voter-id lists to clients.
  return {
    monthLabel: state.monthLabel,
    votingClosesLabel: `Voting closes ${new Date(state.votingClosesAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    votingClosesAt: state.votingClosesAt,
    submissions: state.submissions,
  };
}

// Exported for tests only.
export const _internal = { freshState, applyMonthlyResetIfNeeded, monthLabelFor, votingClosesAtFor, STATE_PATH, load, save };
