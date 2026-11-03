import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Point the store at a throwaway directory BEFORE importing it, so these
// tests never touch real challenge data. node --test runs each file in its
// own process, so this doesn't leak into other test files.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handydad-challenge-"));
process.env.CHALLENGE_STATE_PATH = path.join(dir, "state.json");

const store = await import("../lib/challengeStore.js");
const { createRateLimiter } = await import("../lib/rateLimit.js");
const { default: app } = await import("../server.js");
const { _internal, addSubmission, castVote, getChallenge, LIMITS } = store;

function reset() {
  for (const file of fs.readdirSync(dir)) fs.rmSync(path.join(dir, file), { force: true });
}

test.beforeEach(reset);
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

// ---- durability ---------------------------------------------------------

test("saving leaves no temp file behind and keeps the previous state as a backup", () => {
  addSubmission({ title: "First", builderName: "A" });
  addSubmission({ title: "Second", builderName: "B" });
  const files = fs.readdirSync(dir).sort();
  assert.deepEqual(files, ["state.json", "state.json.bak"]);

  const backup = JSON.parse(fs.readFileSync(_internal.BACKUP_PATH, "utf8"));
  assert.equal(backup.submissions.length, 1, "backup holds the state before the last write");
});

test("a corrupt state file is moved aside and the backup is restored", () => {
  addSubmission({ title: "Keep me", builderName: "A" });
  addSubmission({ title: "Also keep me", builderName: "B" });
  fs.writeFileSync(_internal.STATE_PATH, "{ this is not json");

  const challenge = getChallenge();
  assert.equal(challenge.submissions.length, 1, "restored from the backup, which has the earlier state");
  assert.equal(challenge.submissions[0].title, "Keep me");
  assert.ok(fs.readdirSync(dir).some((f) => f.startsWith("state.json.corrupt-")), "corrupt file is kept, not deleted");
});

test("a corrupt state file with no backup starts a fresh month instead of crashing", () => {
  fs.writeFileSync(_internal.STATE_PATH, "garbage");
  const challenge = getChallenge();
  assert.equal(challenge.submissions.length, 0);
  assert.match(challenge.monthLabel, /Build of the Month$/);
});

test("valid JSON with the wrong shape is treated as corrupt", () => {
  fs.writeFileSync(_internal.STATE_PATH, JSON.stringify({ submissions: "nope" }));
  assert.equal(getChallenge().submissions.length, 0);
  assert.ok(fs.readdirSync(dir).some((f) => f.startsWith("state.json.corrupt-")));
});

// ---- vote integrity -----------------------------------------------------

test("vote counts are derived from the voter lists, so a drifted counter is corrected", () => {
  const { submission } = addSubmission({ title: "Drift", builderName: "A" });
  castVote(submission.id, "voter-1");
  castVote(submission.id, "voter-2");

  const state = JSON.parse(fs.readFileSync(_internal.STATE_PATH, "utf8"));
  state.submissions[0].votes = 999; // simulate a hand edit or an old bug
  state.votes[submission.id].push("voter-1"); // and a duplicate voter entry
  fs.writeFileSync(_internal.STATE_PATH, JSON.stringify(state));

  assert.equal(getChallenge().submissions[0].votes, 2);
});

test("voterIds that are the wrong type, too long, or contain odd characters are rejected", () => {
  const { submission } = addSubmission({ title: "Ids", builderName: "A" });
  for (const bad of ["x".repeat(65), "has space", "semi;colon", "<script>", 12345, {}, []]) {
    const result = castVote(submission.id, bad);
    assert.equal(result.ok, false, `${JSON.stringify(bad)} should be rejected`);
    assert.equal(result.reason, "invalid_voter_id");
  }
  assert.equal(castVote(submission.id, "").reason, "missing_voter_id");
  assert.equal(castVote(submission.id, undefined).reason, "missing_voter_id");
  assert.equal(castVote(submission.id, crypto.randomUUID()).ok, true, "a real randomUUID is accepted");
});

test("distinct voters each count once, and the count never exceeds the voter list", () => {
  const { submission } = addSubmission({ title: "Count", builderName: "A" });
  for (let i = 0; i < 10; i++) castVote(submission.id, `voter-${i}`);
  for (let i = 0; i < 10; i++) castVote(submission.id, `voter-${i}`); // repeats
  assert.equal(getChallenge().submissions[0].votes, 10);
});

// ---- submission limits --------------------------------------------------

test("titles and names are trimmed, and empty or oversized ones are rejected with a readable message", () => {
  assert.equal(addSubmission({ title: "  Deck  ", builderName: " Sam " }).submission.title, "Deck");

  const empty = addSubmission({ title: "   ", builderName: "Sam" });
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, "invalid_title");

  const long = addSubmission({ title: "x".repeat(LIMITS.TITLE_MAX + 1), builderName: "Sam" });
  assert.equal(long.reason, "invalid_title");
  assert.match(long.message, /100 characters/);

  assert.equal(addSubmission({ title: "Ok", builderName: "y".repeat(LIMITS.BUILDER_NAME_MAX + 1) }).reason, "invalid_builder_name");
  assert.equal(addSubmission({ title: 42, builderName: "Sam" }).reason, "invalid_title");
});

test("a month stops accepting submissions at the cap", () => {
  for (let i = 0; i < LIMITS.SUBMISSIONS_PER_MONTH_MAX; i++) {
    assert.equal(addSubmission({ title: `Build ${i}`, builderName: "A" }).ok, true);
  }
  const over = addSubmission({ title: "One too many", builderName: "A" });
  assert.equal(over.ok, false);
  assert.equal(over.reason, "submissions_full");
});

// ---- rate limiter -------------------------------------------------------

test("the rate limiter allows up to max per window, then 429s with Retry-After, then recovers", () => {
  let t = 1_000_000;
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3, now: () => t });
  const req = { ip: "1.2.3.4" };
  const makeRes = () => {
    const res = { headers: {}, statusCode: 200, body: null };
    res.set = (k, v) => ((res.headers[k] = v), res);
    res.status = (c) => ((res.statusCode = c), res);
    res.json = (b) => ((res.body = b), res);
    return res;
  };

  let passed = 0;
  for (let i = 0; i < 3; i++) limiter(req, makeRes(), () => passed++);
  assert.equal(passed, 3);

  const blocked = makeRes();
  limiter(req, blocked, () => assert.fail("should not pass"));
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.error, "rate_limited");
  assert.equal(blocked.headers["Retry-After"], "60");

  const otherIp = makeRes();
  let otherPassed = false;
  limiter({ ip: "5.6.7.8" }, otherIp, () => (otherPassed = true));
  assert.equal(otherPassed, true, "a different IP has its own bucket");

  t += 60_001;
  let recovered = false;
  limiter(req, makeRes(), () => (recovered = true));
  assert.equal(recovered, true, "allowed again once the window passes");
});

// ---- HTTP behaviour -----------------------------------------------------

async function withServer(fn) {
  const server = app.listen(0);
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }
}

const post = (base, url, body, raw) =>
  fetch(base + url, { method: "POST", headers: { "content-type": "application/json" }, body: raw ?? JSON.stringify(body) });

test("malformed JSON gets a JSON 400, not an HTML error page", async () => {
  await withServer(async (base) => {
    const res = await post(base, "/api/challenge/submissions", null, "{not json");
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "invalid_json");
  });
});

test("an oversized body gets a JSON 413", async () => {
  await withServer(async (base) => {
    const res = await post(base, "/api/challenge/submissions", { title: "x".repeat(20_000), builderName: "A" });
    assert.equal(res.status, 413);
    assert.equal((await res.json()).error, "payload_too_large");
  });
});

test("submission errors put a readable message in `error`, which the frontend shows as-is", async () => {
  await withServer(async (base) => {
    const res = await post(base, "/api/challenge/submissions", { title: "", builderName: "A" });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /build title/i);
    assert.equal(body.code, "invalid_title");
  });
});

test("voting over HTTP: success, duplicate (409), bad voterId (400), unknown submission (404)", async () => {
  await withServer(async (base) => {
    const created = await (await post(base, "/api/challenge/submissions", { title: "Swing", builderName: "A" })).json();
    const id = created.submission.id;

    const ok = await post(base, `/api/challenge/submissions/${id}/vote`, { voterId: "voter-1" });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).submission.votes, 1);

    const dup = await post(base, `/api/challenge/submissions/${id}/vote`, { voterId: "voter-1" });
    assert.equal(dup.status, 409);
    assert.equal((await dup.json()).error, "already_voted");

    const bad = await post(base, `/api/challenge/submissions/${id}/vote`, { voterId: "not valid!" });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, "invalid_voter_id");

    const missing = await post(base, "/api/challenge/submissions/sub-nope/vote", { voterId: "voter-2" });
    assert.equal(missing.status, 404);
  });
});

test("the vote endpoint starts returning 429 once one IP exceeds its limit", async () => {
  await withServer(async (base) => {
    const created = await (await post(base, "/api/challenge/submissions", { title: "Flood", builderName: "A" })).json();
    const id = created.submission.id;

    // Earlier tests in this file already spent some of this IP's budget (the
    // limiter counts rejected requests too), so don't assume a fresh window:
    // assert on behaviour instead of an exact cutoff.
    let allowed = 0;
    let blocked = 0;
    let sawRetryAfter = false;
    for (let i = 0; i < 40; i++) {
      const res = await post(base, `/api/challenge/submissions/${id}/vote`, { voterId: `bot-${i}` });
      if (res.status === 200) allowed += 1;
      if (res.status === 429) {
        blocked += 1;
        sawRetryAfter ||= Boolean(res.headers.get("retry-after"));
        assert.equal((await res.json()).error, "rate_limited");
      }
    }
    assert.ok(allowed >= 1 && allowed <= 30, `some votes get through, never more than the limit (got ${allowed})`);
    assert.ok(blocked >= 10, `the rest are blocked (got ${blocked})`);
    assert.equal(allowed + blocked, 40, "every request was either counted or blocked");
    assert.ok(sawRetryAfter, "blocked responses carry Retry-After");
    assert.equal(getChallenge().submissions.find((s) => s.id === id).votes, allowed, "blocked votes were not counted");
  });
});
