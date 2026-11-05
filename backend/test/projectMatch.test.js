import test from "node:test";
import assert from "node:assert/strict";
import app from "../server.js";
import { matchProjects } from "../lib/projectMatch.js";

async function postMatch(body) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/ideas/match`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("matching ranks intended projects", () => {
  assert.equal(matchProjects("raised bed for vegetables")[0].project.id, "chore-raised-garden-bed");
});

test("match endpoint returns frontend contract and rejects blank input", async () => {
  const good = await postMatch({ description: "a swing for children" });
  assert.equal(good.status, 200);
  assert.equal(good.body.matches[0].projectId, "kid-a-frame-swing-set");
  assert.equal(Number.isInteger(good.body.matches[0].matchPercent), true);
  const bad = await postMatch({ description: " " });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, "INVALID_DESCRIPTION");
});
