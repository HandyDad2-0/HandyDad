import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getChallenge, addSubmission, castVote, getArchive, _internal } from "../lib/challengeStore.js";

// Use an isolated state file per test run so this never touches real data.
const originalPath = _internal.STATE_PATH;

test.beforeEach(() => {
  if (fs.existsSync(originalPath)) fs.rmSync(originalPath);
});

test.after(() => {
  if (fs.existsSync(originalPath)) fs.rmSync(originalPath);
});

test("starts with an empty submissions list for the current month", () => {
  const challenge = getChallenge();
  assert.equal(challenge.submissions.length, 0);
  assert.match(challenge.monthLabel, /Build of the Month$/);
});

test("adding a submission returns the shape the frontend expects", () => {
  const { submission } = addSubmission({ title: "Backyard Climbing Wall", builderName: "Dana R." });
  assert.ok(submission.id);
  assert.equal(submission.title, "Backyard Climbing Wall");
  assert.equal(submission.builderName, "Dana R.");
  assert.equal(submission.votes, 0);
  assert.equal(submission.photoLabel, "[photo]");
});

test("a vote increments the submission's count", () => {
  const { submission } = addSubmission({ title: "Reading Loft", builderName: "Priya K." });
  const result = castVote(submission.id, "voter-1");
  assert.equal(result.ok, true);
  assert.equal(result.submission.votes, 1);
});

test("the same voterId cannot vote twice for the same submission", () => {
  const { submission } = addSubmission({ title: "Dog Wash Station", builderName: "James L." });
  castVote(submission.id, "voter-1");
  const second = castVote(submission.id, "voter-1");
  assert.equal(second.ok, false);
  assert.equal(second.reason, "already_voted");
  assert.equal(second.submission.votes, 1); // unchanged
});

test("voting for a nonexistent submission fails cleanly", () => {
  const result = castVote("sub-does-not-exist", "voter-1");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not_found");
});

test("monthly reset archives the closed month and starts fresh with the winner recorded", () => {
  const { submission: a } = addSubmission({ title: "Climbing Wall", builderName: "Dana R." });
  const { submission: b } = addSubmission({ title: "Homework Desk", builderName: "Marcus T." });
  castVote(a.id, "voter-1");
  castVote(a.id, "voter-2");
  castVote(b.id, "voter-3");
  // a has 2 votes, b has 1 -> a should win when the month closes

  const beforeReset = getChallenge();
  assert.equal(beforeReset.submissions.length, 2);

  // Simulate time passing well past this month's close.
  const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 40); // +40 days
  const afterReset = getChallenge(farFuture);

  assert.equal(afterReset.submissions.length, 0, "new month starts with no submissions");
  assert.notEqual(afterReset.monthLabel, beforeReset.monthLabel);

  const archive = getArchive();
  assert.equal(archive.length, 1);
  assert.equal(archive[0].winner.id, a.id, "the higher-voted submission is recorded as the winner");
  assert.equal(archive[0].submissions.length, 2);
});
