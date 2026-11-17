import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { computeAllTiers, PRICE_CATALOG } from "../materials-engine.js";

const seed = JSON.parse(fs.readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8"));
const withBom = seed.filter((p) => Array.isArray(p.materials) && p.materials.length > 0);

// Tier order guard. Retail prices (docs/budget-materials.md) give
// pine < composite < cedar: composite decking is cheaper than cedar decking,
// and the composite tier uses pine framing because composite framing lumber
// isn't a real product. This test fails if someone changes a price in a way
// that scrambles the order, so a price update can't silently break the UI's
// price comparison.

test("the seed library has projects with a bill of materials to check", () => {
  assert.ok(withBom.length >= 18, `expected at least 18 priced projects, found ${withBom.length}`);
});

test("pine is the cheapest tier and cedar the most expensive for every project", () => {
  for (const project of withBom) {
    const { pine, cedar, composite } = computeAllTiers(project.materials);
    assert.ok(pine.total <= composite.total, `${project.id}: pine ($${pine.total}) should not cost more than composite ($${composite.total})`);
    assert.ok(composite.total <= cedar.total, `${project.id}: composite ($${composite.total}) should not cost more than cedar ($${cedar.total})`);
    assert.ok(pine.total < cedar.total, `${project.id}: pine ($${pine.total}) should cost less than cedar ($${cedar.total})`);
  }
});

test("every project that uses decking prices composite strictly between pine and cedar", () => {
  const withDecking = withBom.filter((p) => p.materials.some((m) => m.category === "decking" && m.tiered && m.quantity > 0));
  assert.ok(withDecking.length > 0);
  for (const project of withDecking) {
    const { pine, cedar, composite } = computeAllTiers(project.materials);
    assert.ok(pine.total < composite.total, `${project.id}: composite should cost more than pine`);
    assert.ok(composite.total < cedar.total, `${project.id}: composite should cost less than cedar`);
  }
});

test("per-foot catalog prices keep the same order", () => {
  assert.ok(PRICE_CATALOG.framing.pine <= PRICE_CATALOG.framing.cedar);
  assert.ok(PRICE_CATALOG.decking.pine < PRICE_CATALOG.decking.composite);
  assert.ok(PRICE_CATALOG.decking.composite < PRICE_CATALOG.decking.cedar);
});
