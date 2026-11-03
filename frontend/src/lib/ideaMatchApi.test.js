import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMatches, matchIdea, IdeaSearchUnavailable } from "./ideaMatchApi.js";
import { askQuestion } from "./qaApi.js";

const known = { "a": { id: "a", name: "A" }, "b": { id: "b", name: "B" } };
const lookup = (id) => known[id] ?? null;

const withFetch = async (impl, fn) => {
  const real = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await fn(); } finally { globalThis.fetch = real; }
};
const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("normalizeMatches sorts by percent, rounds, clamps and attaches projects", () => {
  const out = normalizeMatches(
    { matches: [{ projectId: "a", matchPercent: 40.6 }, { projectId: "b", matchPercent: 140, reason: "why" }], noMatch: false },
    lookup
  );
  assert.deepEqual(out.matches.map((m) => [m.project.id, m.matchPercent]), [["b", 100], ["a", 41]]);
  assert.equal(out.matches[0].reason, "why");
  assert.equal(out.noMatch, false);
});

test("normalizeMatches drops unknown projects and non-numeric percents", () => {
  const out = normalizeMatches(
    { matches: [{ projectId: "zzz", matchPercent: 90 }, { projectId: "a", matchPercent: "high" }, { projectId: "b", matchPercent: 50 }] },
    lookup
  );
  assert.deepEqual(out.matches.map((m) => m.project.id), ["b"]);
});

test("no usable matches means noMatch even if the server didn't say so", () => {
  assert.equal(normalizeMatches({ matches: [] }, lookup).noMatch, true);
  assert.equal(normalizeMatches({ matches: [{ projectId: "zzz", matchPercent: 90 }], noMatch: false }, lookup).noMatch, true);
  assert.equal(normalizeMatches({ matches: [{ projectId: "a", matchPercent: 90 }], noMatch: true }, lookup).noMatch, true);
});

test("normalizeMatches rejects a malformed body", () => {
  assert.throws(() => normalizeMatches(null, lookup), /unexpected format/);
  assert.throws(() => normalizeMatches({ matches: "x" }, lookup), /unexpected format/);
});

test("matchIdea: success, 400 message, 404 and network failure", async () => {
  const ok = await withFetch(reply(200, { matches: [{ projectId: "a", matchPercent: 70 }], noMatch: false }), () => matchIdea("x", lookup));
  assert.equal(ok.matches[0].matchPercent, 70);

  await withFetch(reply(400, { code: "INVALID_DESCRIPTION", message: "Describe your idea first." }), async () => {
    await assert.rejects(matchIdea("", lookup), (e) => e.message === "Describe your idea first." && !(e instanceof IdeaSearchUnavailable));
  });
  await withFetch(reply(404, null), async () => {
    await assert.rejects(matchIdea("x", lookup), IdeaSearchUnavailable);
  });
  await withFetch(async () => { throw new TypeError("fetch failed"); }, async () => {
    await assert.rejects(matchIdea("x", lookup), IdeaSearchUnavailable);
  });
});

test("matchIdea sends the description as JSON to /api/ideas/match", async () => {
  let seen;
  await withFetch(async (url, init) => { seen = { url, init }; return reply(200, { matches: [] })(); }, () => matchIdea("a raised bed", lookup));
  assert.equal(seen.url, "/api/ideas/match");
  assert.equal(seen.init.method, "POST");
  assert.deepEqual(JSON.parse(seen.init.body), { description: "a raised bed" });
});

test("askQuestion: 501 stub is an unavailable state with the server's message", async () => {
  const out = await withFetch(reply(501, { code: "QA_NOT_IMPLEMENTED", message: "Build question answers are not available yet.", answer: null, sources: [] }), () => askQuestion({ projectId: "a", question: "q" }));
  assert.deepEqual(out, { status: "unavailable", message: "Build question answers are not available yet." });
});

test("askQuestion: never treats a null answer as advice; 200 with answer is answered", async () => {
  const nul = await withFetch(reply(200, { answer: null }), () => askQuestion({ projectId: "a", question: "q" }));
  assert.equal(nul.status, "unavailable");
  const yes = await withFetch(reply(200, { answer: "Use cedar.", sources: [{ id: 1 }] }), () => askQuestion({ projectId: "a", question: "q" }));
  assert.deepEqual(yes, { status: "answered", answer: "Use cedar.", sources: [{ id: 1 }] });
});

test("askQuestion: 400/404 and network failures throw readable errors", async () => {
  await withFetch(reply(400, { code: "INVALID_QUESTION", message: "Ask a question." }), async () => {
    await assert.rejects(askQuestion({ projectId: "a", question: "" }), /Ask a question\./);
  });
  await withFetch(reply(404, { code: "PROJECT_NOT_FOUND", message: "Unknown project." }), async () => {
    await assert.rejects(askQuestion({ projectId: "zzz", question: "q" }), /Unknown project\./);
  });
  await withFetch(async () => { throw new TypeError("x"); }, async () => {
    await assert.rejects(askQuestion({ projectId: "a", question: "q" }), /Couldn't reach/);
  });
});
