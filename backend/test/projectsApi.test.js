import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import app from "../server.js";
import { computeAllTiers } from "../materials-engine.js";
import { buildMaterialsResponse } from "../lib/projectsHandlers.js";

const seed = JSON.parse(fs.readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8"));

async function get(path) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("GET /api/projects returns every seed project", async () => {
  const { status, body } = await get("/api/projects");
  assert.equal(status, 200);
  assert.equal(body.projects.length, seed.length);
  assert.deepEqual(body.projects.map((p) => p.id), seed.map((p) => p.id));
});

test("GET /api/projects/:id returns the full project record", async () => {
  const { status, body } = await get("/api/projects/kid-simple-playhouse");
  assert.equal(status, 200);
  assert.equal(body.id, "kid-simple-playhouse");
  assert.deepEqual(body.footprint, { length_ft: 6, width_ft: 6 });
});

test("GET /api/projects/:id returns 404 for an unknown project", async () => {
  const { status, body } = await get("/api/projects/not-a-real-project");
  assert.equal(status, 404);
  assert.equal(body.code, "PROJECT_NOT_FOUND");
});

test("GET /api/projects/:id/materials matches the engine for a project with a BOM", async () => {
  const playhouse = seed.find((p) => p.id === "kid-simple-playhouse");
  const { status, body } = await get("/api/projects/kid-simple-playhouse/materials");
  assert.equal(status, 200);
  assert.equal(body.source, "computed");
  assert.deepEqual(body.tiers, computeAllTiers(playhouse.materials));
});

test("GET /api/projects/:id/materials returns 404 for an unknown project", async () => {
  const { status, body } = await get("/api/projects/nope/materials");
  assert.equal(status, 404);
  assert.equal(body.code, "PROJECT_NOT_FOUND");
});

test("every seed project with a BOM can be priced through the endpoint", async () => {
  for (const project of seed.filter((p) => p.materials?.length > 0)) {
    const { status, body } = await get(`/api/projects/${project.id}/materials`);
    assert.equal(status, 200, `${project.id} should price cleanly`);
    assert.equal(body.source, "computed");
    for (const tier of ["pine", "cedar", "composite"]) {
      assert.ok(body.tiers[tier].total > 0, `${project.id} ${tier} total should be positive`);
    }
  }
});

test("a project with no BOM falls back to its estimate range", () => {
  const result = buildMaterialsResponse({
    id: "x",
    materials: [],
    budget_estimate_reference: { pine: [10, 20], cedar: [30, 40], composite: [50, 60] },
  });
  assert.equal(result.source, "estimate");
  assert.deepEqual(result.tiers.cedar, { tier: "cedar", items: [], total: null, estimateRange: [30, 40] });
});

test("a project with neither a BOM nor an estimate is reported unavailable", () => {
  const result = buildMaterialsResponse({ id: "y" });
  assert.deepEqual(result, { projectId: "y", source: "unavailable", tiers: null });
});

test("a BOM the engine cannot price throws, so the endpoint can answer 500", () => {
  assert.throws(() =>
    buildMaterialsResponse({
      id: "z",
      materials: [{ id: "mystery", category: "unobtainium", unit: "each", quantity: 1, tiered: false }],
    })
  );
});
