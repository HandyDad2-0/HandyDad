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

test("valid project question returns an honest, stable stub contract", async () => {
  const result = await postQuestion({ projectId: "kid-backyard-sandbox", question: "Can I change the framing?" });
  assert.equal(result.status, 501);
  assert.deepEqual(result.body, {
    code: "QA_NOT_IMPLEMENTED",
    message: "Build question answers are not available yet.",
    projectId: "kid-backyard-sandbox",
    answer: null,
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
