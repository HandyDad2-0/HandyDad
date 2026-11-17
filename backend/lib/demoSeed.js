/**
 * Demo data for the Monthly Build Challenge.
 * Owner: Razee Nepal
 *
 * The challenge starts empty every month, so a demo (or a screenshot for the
 * report) would show "No builds have been submitted this month yet." This
 * adds a handful of SAMPLE submissions with votes so the leaderboard has
 * something to show.
 *
 * These are made-up builds and made-up builder names. They go through the
 * real store functions (addSubmission / castVote), so they are stored and
 * ranked exactly like real entries, which also means nothing in the data marks
 * them as samples: tell your audience they are sample data.
 *
 * Safe by default: it refuses to add anything if this month already has
 * submissions, so it can't pile demo entries on top of real ones.
 */

import fs from "node:fs";
import { addSubmission, castVote, getChallenge, _internal } from "./challengeStore.js";

export const DEMO_BUILDS = [
  { title: "Backyard Sandbox with a Cedar Lid", builderName: "Priya S.", votes: 14 },
  { title: "Mud Kitchen for the Twins", builderName: "Marcus T.", votes: 11 },
  { title: "Raised Garden Bed, Beginner Edition", builderName: "Dana L.", votes: 8 },
  { title: "Compost Bin from Scrap Pine", builderName: "Jordan K.", votes: 5 },
  { title: "Kid-Size Picnic Table", builderName: "Elena R.", votes: 2 },
];

/**
 * @param {Object} [options]
 * @param {boolean} [options.force] add the demo builds even if this month already has submissions
 * @param {boolean} [options.reset] first move the whole state file aside (kept as a backup, never deleted), then seed a fresh month
 * @param {Date} [options.now] clock, injectable for tests
 * @returns {{ ok: true, monthLabel: string, added: Array<{title: string, builderName: string, votes: number}>, backupPath: string | null }
 *   | { ok: false, reason: "not_empty", monthLabel: string, count: number }}
 */
export function seedDemoChallenge({ force = false, reset = false, now = new Date() } = {}) {
  let backupPath = null;
  if (reset && fs.existsSync(_internal.STATE_PATH)) {
    backupPath = `${_internal.STATE_PATH}.before-demo-${Date.now()}`;
    fs.renameSync(_internal.STATE_PATH, backupPath);
  }

  const current = getChallenge(now);
  if (current.submissions.length > 0 && !force) {
    return { ok: false, reason: "not_empty", monthLabel: current.monthLabel, count: current.submissions.length };
  }

  const added = [];
  for (const build of DEMO_BUILDS) {
    const result = addSubmission({ title: build.title, builderName: build.builderName }, now);
    if (!result.ok) throw new Error(`Could not add demo build "${build.title}": ${result.message}`);
    for (let i = 0; i < build.votes; i++) {
      const vote = castVote(result.submission.id, `demo-voter-${i + 1}`, now);
      if (!vote.ok) throw new Error(`Could not add a demo vote for "${build.title}": ${vote.reason}`);
    }
    added.push({ title: build.title, builderName: build.builderName, votes: build.votes });
  }

  return { ok: true, monthLabel: getChallenge(now).monthLabel, added, backupPath };
}
