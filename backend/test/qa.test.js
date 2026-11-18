import test from "node:test";
import assert from "node:assert/strict";
import app from "../server.js";

async function postQuestion(body) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/qa/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("a question answerable from approved project data returns a sourced answer", async () => {
  const result = await postQuestion({ projectId: "kid-backyard-sandbox", question: "What materials do I need?" });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    projectId: "kid-backyard-sandbox",
    status: "verified",
    answer: "The approved catalog lists: 16 linear_ft of Framing 2x4; 16 linear_ft of Decking Boards; 1 box_100 of Deck Screws 2in; 4 each of Corner Brackets.",
    sources: [{ source: "data/seed-projects.json", projectId: "kid-backyard-sandbox", field: "materials", label: "Approved materials list" }]
  });
});

test("a question outside the approved data (e.g. safety) is honestly declined, not guessed at", async () => {
  const result = await postQuestion({ projectId: "kid-backyard-sandbox", question: "Is this safe to build near a fence?" });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    projectId: "kid-backyard-sandbox",
    status: "cannot_verify",
    answer: null,
    message: "This question cannot be verified from the approved HandyDad project data. Check applicable local requirements or a qualified professional for safety, structural, electrical, plumbing, or code decisions.",
    sources: []
  });
});

test("blank or wrong-type questions are rejected", async () => {
  for (const body of [{ projectId: "kid-backyard-sandbox", question: "  " },
    { projectId: 42, question: "Which screws?" }, {}]) {
    const result = await postQuestion(body);
    assert.equal(result.status, 400);
    assert.equal(result.body.code, "INVALID_QUESTION");
  }
});

test("unknown projects are rejected before the stub response", async () => {
  const result = await postQuestion({ projectId: "missing", question: "What do I need?" });
  assert.equal(result.status, 404);
  assert.equal(result.body.code, "PROJECT_NOT_FOUND");
});
