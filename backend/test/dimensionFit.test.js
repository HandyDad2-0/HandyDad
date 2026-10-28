import test from "node:test";
import assert from "node:assert/strict";
import app from "../server.js";

async function postDimensionFit(body) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/dimension-fit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

const validBody = {
  projectId: "kid-backyard-sandbox",
  length_ft: 5,
  width_ft: 5,
  clearance_ft: 4,
};

test("a valid request returns flags and hasBlockingFlags", async () => {
  const result = await postDimensionFit(validBody);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { flags: [], hasBlockingFlags: false });
});

test("missing or blank projectId is rejected", async () => {
  for (const body of [{ ...validBody, projectId: undefined }, { ...validBody, projectId: "  " }, { ...validBody, projectId: 42 }]) {
    const result = await postDimensionFit(body);
    assert.equal(result.status, 400);
    assert.equal(result.body.code, "INVALID_PROJECT_ID");
  }
});

test("an unknown projectId is rejected before dimension checks run", async () => {
  const result = await postDimensionFit({ ...validBody, projectId: "not-a-real-project" });
  assert.equal(result.status, 404);
  assert.equal(result.body.code, "PROJECT_NOT_FOUND");
});

test("zero, negative, non-numeric, and too-large dimensions are all rejected with the offending fields named", async () => {
  const cases = [
    { ...validBody, length_ft: 0 },
    { ...validBody, width_ft: -2 },
    { ...validBody, clearance_ft: "4" },
    { ...validBody, length_ft: 1_000_001 },
    { ...validBody, length_ft: null },
    { ...validBody, width_ft: NaN },
  ];
  for (const body of cases) {
    const result = await postDimensionFit(body);
    assert.equal(result.status, 400, JSON.stringify(body));
    assert.equal(result.body.code, "INVALID_DIMENSIONS");
    assert.ok(result.body.fields.length > 0);
  }
});

test("missing dimensions (not just invalid ones) are rejected the same way", async () => {
  const result = await postDimensionFit({ projectId: "kid-backyard-sandbox" });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "INVALID_DIMENSIONS");
  assert.deepEqual(result.body.fields.sort(), ["clearance_ft", "length_ft", "width_ft"]);
});

test("obstacles is optional; omitting it defaults every flag input to false", async () => {
  const result = await postDimensionFit(validBody);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.flags, []);
});

test("obstacles fields must be booleans when present", async () => {
  const result = await postDimensionFit({ ...validBody, obstacles: { sloped: "yes" } });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "INVALID_OBSTACLES");
  assert.deepEqual(result.body.fields, ["sloped"]);
});

test("a relevant, checked obstacle produces a flag through the real endpoint", async () => {
  // chore-raised-garden-bed lists slope and utility_lines as relevant obstacles.
  const result = await postDimensionFit({
    projectId: "chore-raised-garden-bed",
    length_ft: 4,
    width_ft: 8,
    clearance_ft: 2,
    obstacles: { sloped: true },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.flags.length, 1);
  assert.match(result.body.flags[0].text, /slope/);
});

test("entered_height_ft, when supplied, is still validated even for a project with no height threshold", async () => {
  // None of the current 8 seed projects set max_unassisted_height_ft, so this
  // only exercises the "validated if present" path, not the "required
  // because the project has a threshold" path — that's covered at the
  // engine level in dimensionFitEngine.test.js, where a project with a
  // threshold can be constructed directly.
  const result = await postDimensionFit({ ...validBody, entered_height_ft: -1 });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "INVALID_HEIGHT");
});
