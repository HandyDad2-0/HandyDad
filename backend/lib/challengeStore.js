/**
 * Monthly Build Challenge — data store and monthly reset logic.
 * Owner: Razee Nepal
 *
 * Persists to a JSON file (data/challenge-state.json, or the path in the
 * CHALLENGE_STATE_PATH environment variable) so submissions and votes
 * survive a restart: same "flat JSON file, swap for a DB later" approach as
 * data/seed-projects.json. See docs/monthly-build-challenge-backend.md.
 *
 * Durability:
 *   - Writes go to a temp file, are fsynced, then renamed over the real file,
 *     so a crash mid-write can't leave a half-written state file.
 *   - The previous good state is kept as <file>.bak.
 *   - If the state file is unreadable or malformed it is moved aside as
 *     <file>.corrupt-<timestamp> (never deleted) and the backup is restored,
 *     or a fresh month is started if there is no usable backup.
 *
 * One process only: every function here is synchronous, which is what makes
 * read-modify-write safe. Running two server processes against the same file
 * would break that.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = process.env.CHALLENGE_STATE_PATH || path.join(__dirname, "..", "data", "challenge-state.json");
const BACKUP_PATH = `${STATE_PATH}.bak`;

export const LIMITS = {
  TITLE_MAX: 100,
  BUILDER_NAME_MAX: 60,
  SUBMISSIONS_PER_MONTH_MAX: 100,
};

// The frontend sends crypto.randomUUID(); allow any short id-like token but
// bound the size so a client can't bloat the state file with junk.
const VOTER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

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
    votes: {}, // { [submissionId]: [voterId, ...] }, one entry per distinct voter
    archive: [], // past months: { monthLabel, submissions, winner, closedAt }
  };
}

function isValidState(state) {
  return (
    state !== null &&
    typeof state === "object" &&
    typeof state.monthLabel === "string" &&
    typeof state.votingClosesAt === "string" &&
    !Number.isNaN(Date.parse(state.votingClosesAt)) &&
    Array.isArray(state.submissions) &&
    state.votes !== null &&
    typeof state.votes === "object" &&
    !Array.isArray(state.votes) &&
    Array.isArray(state.archive)
  );
}

/**
 * The voter lists are the source of truth for votes; each submission's
 * `votes` is always derived from them so the two can never drift apart.
 */
function normalizeState(state) {
  const votes = {};
  for (const submission of state.submissions) {
    const voters = Array.isArray(state.votes[submission.id]) ? state.votes[submission.id] : [];
    votes[submission.id] = [...new Set(voters)];
    submission.votes = votes[submission.id].length;
  }
  state.votes = votes;
  return state;
}

function readStateFile(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function load() {
  if (!fs.existsSync(STATE_PATH)) {
    const state = freshState();
    save(state);
    return state;
  }

  let state = readStateFile(STATE_PATH);
  if (!state) {
    const quarantined = `${STATE_PATH}.corrupt-${Date.now()}`;
    try {
      fs.renameSync(STATE_PATH, quarantined);
      console.error(`Challenge state file was unreadable; moved to ${quarantined}`);
    } catch (error) {
      console.error(`Challenge state file was unreadable and could not be moved aside: ${error.message}`);
    }
    state = readStateFile(BACKUP_PATH);
    if (state) {
      console.error("Restored challenge state from the last backup.");
    } else {
      console.error("No usable backup; starting a fresh challenge month.");
      state = freshState();
    }
    save(state);
  }
  return normalizeState(state);
}

function save(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  const tmp = `${STATE_PATH}.tmp`;
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeSync(fd, JSON.stringify(state, null, 2) + "\n");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (fs.existsSync(STATE_PATH)) fs.copyFileSync(STATE_PATH, BACKUP_PATH);
  fs.renameSync(tmp, STATE_PATH);
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

/**
 * Returns { ok: true, challenge, submission } on success, or
 * { ok: false, reason, message } where reason is one of
 * "invalid_title", "invalid_builder_name" or "submissions_full".
 * `message` is written to be shown to the user as-is.
 */
export function addSubmission({ title, builderName }, now = new Date()) {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  const cleanName = typeof builderName === "string" ? builderName.trim() : "";

  if (!cleanTitle || cleanTitle.length > LIMITS.TITLE_MAX) {
    return {
      ok: false,
      reason: "invalid_title",
      message: `Enter a build title of up to ${LIMITS.TITLE_MAX} characters.`,
    };
  }
  if (!cleanName || cleanName.length > LIMITS.BUILDER_NAME_MAX) {
    return {
      ok: false,
      reason: "invalid_builder_name",
      message: `Enter your name, up to ${LIMITS.BUILDER_NAME_MAX} characters.`,
    };
  }

  let state = load();
  state = applyMonthlyResetIfNeeded(state, now);

  if (state.submissions.length >= LIMITS.SUBMISSIONS_PER_MONTH_MAX) {
    save(state);
    return {
      ok: false,
      reason: "submissions_full",
      message: "This month's challenge has reached its submission limit.",
    };
  }

  const submission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanTitle,
    builderName: cleanName,
    votes: 0,
    photoLabel: "[photo]",
  };
  state.submissions.push(submission);
  state.votes[submission.id] = [];

  save(state);
  return { ok: true, challenge: publicView(state), submission };
}

/**
 * Records one vote for a submission from a given voterId (a random id the
 * client generates once and persists — see frontend integration notes in
 * the design doc). Returns { ok: true, submission } on success, or
 * { ok: false, reason } where reason is "missing_voter_id",
 * "invalid_voter_id", "not_found" or "already_voted".
 */
export function castVote(submissionId, voterId, now = new Date()) {
  if (voterId === undefined || voterId === null || voterId === "") {
    return { ok: false, reason: "missing_voter_id" };
  }
  if (typeof voterId !== "string" || !VOTER_ID_PATTERN.test(voterId)) {
    return { ok: false, reason: "invalid_voter_id" };
  }

  let state = load();
  state = applyMonthlyResetIfNeeded(state, now);

  const submission = state.submissions.find((s) => s.id === submissionId);
  if (!submission) {
    save(state);
    return { ok: false, reason: "not_found" };
  }

  const votersForSubmission = state.votes[submissionId] ?? (state.votes[submissionId] = []);
  if (votersForSubmission.includes(voterId)) {
    return { ok: false, reason: "already_voted", submission };
  }

  votersForSubmission.push(voterId);
  submission.votes = votersForSubmission.length;

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
export const _internal = {
  freshState,
  applyMonthlyResetIfNeeded,
  monthLabelFor,
  votingClosesAtFor,
  normalizeState,
  STATE_PATH,
  BACKUP_PATH,
  load,
  save,
};
