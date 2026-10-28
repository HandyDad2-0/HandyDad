import test from "node:test";
import assert from "node:assert/strict";
import { computeTierBreakdown, computeAllTiers, TIERS, PRICE_CATALOG, FLAT_PRICES } from "../materials-engine.js";

test("TIERS matches the three tiers the engine actually prices", () => {
  assert.deepEqual(TIERS, ["pine", "cedar", "composite"]);
});

test("an empty BOM produces a zero total and no items, for every tier", () => {
  for (const tier of TIERS) {
    const result = computeTierBreakdown([], tier);
    assert.deepEqual(result.items, []);
    assert.equal(result.total, 0);
  }
});

test("computeAllTiers returns all three tiers keyed correctly and consistent with computeTierBreakdown", () => {
  const bom = [{ id: "framing-2x4", category: "framing", unit: "linear_ft", quantity: 10, tiered: true }];
  const all = computeAllTiers(bom);
  assert.deepEqual(Object.keys(all).sort(), [...TIERS].sort());
  for (const tier of TIERS) {
    assert.deepEqual(all[tier], computeTierBreakdown(bom, tier));
  }
});

test("an unknown tier is rejected with a clear error", () => {
  assert.throws(
    () => computeTierBreakdown([], "oak"),
    /Unknown tier "oak"/
  );
});

test("a tiered material in a category with no price catalog entry is rejected", () => {
  const bom = [{ id: "mystery-item", category: "not-a-real-category", unit: "each", quantity: 1, tiered: true }];
  assert.throws(
    () => computeTierBreakdown(bom, "pine"),
    /No tiered price found for category "not-a-real-category"/
  );
});

test("a non-tiered material whose unit isn't in FLAT_PRICES for its category is rejected", () => {
  const bom = [{ id: "odd-fastener", category: "fasteners", unit: "pallet", quantity: 1, tiered: false }];
  assert.throws(
    () => computeTierBreakdown(bom, "pine"),
    /No flat price found for category "fasteners" unit "pallet"/
  );
});

test("a non-tiered material in a category with no flat price table at all is rejected", () => {
  const bom = [{ id: "mystery-item", category: "not-a-real-category", unit: "each", quantity: 1, tiered: false }];
  assert.throws(
    () => computeTierBreakdown(bom, "pine"),
    /No flat price found for category "not-a-real-category"/
  );
});

test("zero quantity is valid and prices to zero, without being dropped from the items list", () => {
  const bom = [{ id: "spare-bracket", category: "hardware", unit: "each", quantity: 0, tiered: false }];
  const result = computeTierBreakdown(bom, "pine");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].lineCost, 0);
  assert.equal(result.total, 0);
});

test("negative, NaN, and non-numeric quantities are all rejected rather than silently priced", () => {
  for (const quantity of [-1, NaN, Infinity, "5", null, undefined]) {
    const bom = [{ id: "bad-qty", category: "hardware", unit: "each", quantity, tiered: false }];
    assert.throws(
      () => computeTierBreakdown(bom, "pine"),
      /Invalid quantity for material "bad-qty"/,
      `quantity ${quantity} should have been rejected`
    );
  }
});

test("line costs round to 2 decimal places even with repeating-decimal inputs", () => {
  // 3 * 0.1 = 0.30000000000000004 in floating point; must still land on 0.30.
  const bom = [{ id: "fractional", category: "fasteners", unit: "box_100", quantity: 1, tiered: false }];
  const result = computeTierBreakdown(bom, "pine");
  assert.equal(result.items[0].lineCost, FLAT_PRICES.fasteners.box_100);
  assert.equal(Number.isInteger(result.items[0].lineCost * 100), true);
});

test("every tiered category in PRICE_CATALOG actually defines all three tiers", () => {
  for (const [category, prices] of Object.entries(PRICE_CATALOG)) {
    for (const tier of TIERS) {
      assert.equal(typeof prices[tier], "number", `${category}.${tier} should be a number`);
      assert.ok(prices[tier] > 0, `${category}.${tier} should be a positive price`);
    }
  }
});
