import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Point the store at a throwaway directory BEFORE importing it, so these
// tests never touch real challenge data. node --test runs each file in its
// own process, so this doesn't leak into other test files.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handydad-demoseed-"));
process.env.CHALLENGE_STATE_PATH = path.join(dir, "state.json");

const { seedDemoChallenge, DEMO_BUILDS } = await import("../lib/demoSeed.js");
const { getChallenge, addSubmission, _internal } = await import("../lib/challengeStore.js");
const { default: app } = await import("../server.js");

function reset() {
  for (const file of fs.readdirSync(dir)) fs.rmSync(path.join(dir, file), { force: true });
}

test.beforeEach(reset);
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test("seeding an empty month adds every sample build with its votes", () => {
  const result = seedDemoChallenge();
  assert.equal(result.ok, true);
  assert.equal(result.added.length, DEMO_BUILDS.length);

  const { submissions } = getChallenge();
  assert.equal(submissions.length, DEMO_BUILDS.length);
  for (const build of DEMO_BUILDS) {
    const stored = submissions.find((s) => s.title === build.title);
    assert.ok(stored, `${build.title} should be stored`);
    assert.equal(stored.builderName, build.builderName);
    assert.equal(stored.votes, build.votes);
  }
});

test("the sample builds rank in a clear order with no ties, so the leaderboard looks right", () => {
  seedDemoChallenge();
  const votes = [...getChallenge().submissions].sort((a, b) => b.votes - a.votes).map((s) => s.votes);
  assert.deepEqual(votes, [...new Set(votes)], "every build has a different vote count");
  assert.equal(votes[0], Math.max(...DEMO_BUILDS.map((b) => b.votes)));
});

test("sample data passes the store's own limits and voter-id rules", () => {
  // seedDemoChallenge throws if the store rejects a build or a vote, so
  // simply completing is the check; this also guards against future limit changes.
  assert.doesNotThrow(() => seedDemoChallenge());
});

test("it refuses to add anything when the month already has submissions", () => {
  addSubmission({ title: "A real entry", builderName: "Someone" });
  const result = seedDemoChallenge();
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not_empty");
  assert.equal(result.count, 1);

  const { submissions } = getChallenge();
  assert.equal(submissions.length, 1, "nothing was added");
  assert.equal(submissions[0].title, "A real entry");
});

test("running it twice does not duplicate the sample builds", () => {
  assert.equal(seedDemoChallenge().ok, true);
  assert.equal(seedDemoChallenge().ok, false);
  assert.equal(getChallenge().submissions.length, DEMO_BUILDS.length);
});

test("--force adds the sample builds on top of existing entries", () => {
  addSubmission({ title: "A real entry", builderName: "Someone" });
  const result = seedDemoChallenge({ force: true });
  assert.equal(result.ok, true);
  assert.equal(getChallenge().submissions.length, DEMO_BUILDS.length + 1);
});

test("--reset keeps the old data as a backup file and starts the month fresh", () => {
  addSubmission({ title: "A real entry", builderName: "Someone" });
  const result = seedDemoChallenge({ reset: true });
  assert.equal(result.ok, true);
  assert.ok(result.backupPath, "a backup path is reported");
  assert.ok(fs.existsSync(result.backupPath), "the backup file exists");

  const backup = JSON.parse(fs.readFileSync(result.backupPath, "utf8"));
  assert.equal(backup.submissions[0].title, "A real entry", "the old data is preserved in the backup");

  const titles = getChallenge().submissions.map((s) => s.title);
  assert.ok(!titles.includes("A real entry"), "the live month no longer has the old entry");
  assert.equal(titles.length, DEMO_BUILDS.length);
});

test("--reset on a brand-new install (no state file yet) just seeds and reports no backup", () => {
  assert.equal(fs.existsSync(_internal.STATE_PATH), false);
  const result = seedDemoChallenge({ reset: true });
  assert.equal(result.ok, true);
  assert.equal(result.backupPath, null);
});

test("the running server shows seeded builds straight away, because the store re-reads its file", async () => {
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const before = await (await fetch(`${base}/api/challenge`)).json();
    assert.equal(before.submissions.length, 0);

    seedDemoChallenge(); // as if run from another terminal while the server is up

    const after = await (await fetch(`${base}/api/challenge`)).json();
    assert.equal(after.submissions.length, DEMO_BUILDS.length);
  } finally {
    await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }
});

test("seeding on the first day of a new month fills the NEW month, not the archived one", () => {
  addSubmission({ title: "Last month's entry", builderName: "Someone" }, new Date(2026, 10, 15)); // Nov 15
  const dec2 = new Date(2026, 11, 2);
  const result = seedDemoChallenge({ now: dec2 });
  assert.equal(result.ok, true);
  assert.match(result.monthLabel, /^December/);

  const view = getChallenge(dec2);
  assert.match(view.monthLabel, /^December/);
  assert.equal(view.submissions.length, DEMO_BUILDS.length);
  assert.ok(!view.submissions.some((s) => s.title === "Last month's entry"));
});
