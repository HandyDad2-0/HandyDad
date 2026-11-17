#!/usr/bin/env node
/**
 * Adds sample Monthly Challenge submissions and votes for demos.
 * Owner: Razee Nepal
 *
 *   npm run seed:demo --prefix backend            # only if this month is empty
 *   npm run seed:demo --prefix backend -- --reset # start the month over first
 *   npm run seed:demo --prefix backend -- --force # add even if there are entries
 *
 * The challenge resets on the last day of each month, so run this AFTER the
 * month you are demoing has started. It works while the backend is running
 * (the store re-reads its file on every request). See
 * docs/monthly-build-challenge-backend.md, "Demo data".
 */

import { seedDemoChallenge } from "../lib/demoSeed.js";
import { _internal } from "../lib/challengeStore.js";

const args = new Set(process.argv.slice(2));
const known = new Set(["--force", "--reset"]);
const unknown = [...args].filter((a) => !known.has(a));
if (unknown.length > 0 || args.has("--help") || args.has("-h")) {
  console.error("Usage: npm run seed:demo --prefix backend -- [--reset] [--force]");
  console.error("  (no flags)  add sample builds only if this month has no submissions");
  console.error("  --reset     move the current state file aside (kept as a backup), then add sample builds");
  console.error("  --force     add sample builds even if this month already has submissions");
  process.exit(unknown.length > 0 ? 1 : 0);
}

const result = seedDemoChallenge({ force: args.has("--force"), reset: args.has("--reset") });

if (!result.ok) {
  console.error(
    `${result.monthLabel} already has ${result.count} submission${result.count === 1 ? "" : "s"}, so nothing was added.`
  );
  console.error("Use --reset to start the month over (your current data is kept as a backup),");
  console.error("or --force to add the sample builds on top.");
  process.exit(1);
}

console.log(`Added ${result.added.length} sample builds to "${result.monthLabel}":`);
for (const build of result.added) {
  console.log(`  ${String(build.votes).padStart(2)} votes  ${build.title}  (${build.builderName})`);
}
if (result.backupPath) console.log(`\nPrevious data was kept at: ${result.backupPath}`);
console.log(`\nState file: ${_internal.STATE_PATH}`);
console.log("These are made-up sample entries. Tell your audience they are sample data.");
