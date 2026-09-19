/**
 * Budget & Materials Engine
 * Owner: Razee Nepal
 *
 * Computes pine/cedar/composite tier costs for a project's Bill of
 * Materials (BOM). See docs/budget-materials.md for the design doc
 * and data model this implements.
 */

export const TIERS = ["pine", "cedar", "composite"];

/**
 * Price catalog: $/unit by category and tier.
 * Only "tiered" categories need entries here. Update this table to
 * change pricing without touching any project's BOM data.
 */
export const PRICE_CATALOG = {
  framing: { pine: 0.65, cedar: 1.85, composite: 2.10 }, // $/linear_ft
  decking: { pine: 1.10, cedar: 3.25, composite: 4.50 }, // $/linear_ft
};

/**
 * Flat prices for non-tiered categories: $/unit, same across all tiers.
 */
export const FLAT_PRICES = {
  fasteners: { box_100: 8.5 },
  hardware: { each: 4.25 },
  finish: { gallon: 32.0 },
};

/**
 * @typedef {Object} MaterialLine
 * @property {string} id
 * @property {string} category   - "framing" | "decking" | "fasteners" | "hardware" | "finish"
 * @property {string} unit       - e.g. "linear_ft", "box_100", "each", "gallon"
 * @property {number} quantity
 * @property {boolean} tiered    - true if price varies by pine/cedar/composite
 */

/**
 * Look up the unit price for a single BOM line at a given tier.
 * @param {MaterialLine} line
 * @param {string} tier - one of TIERS
 * @returns {number} price per unit
 */
function unitPriceFor(line, tier) {
  if (line.tiered) {
    const categoryPrices = PRICE_CATALOG[line.category];
    if (!categoryPrices || categoryPrices[tier] == null) {
      throw new Error(
        `No tiered price found for category "${line.category}" at tier "${tier}"`
      );
    }
    return categoryPrices[tier];
  }
  const flat = FLAT_PRICES[line.category];
  if (!flat || flat[line.unit] == null) {
    throw new Error(
      `No flat price found for category "${line.category}" unit "${line.unit}"`
    );
  }
  return flat[line.unit];
}

/**
 * Compute the itemized cost breakdown for one project at one tier.
 * @param {MaterialLine[]} materials - the project's BOM
 * @param {string} tier - one of TIERS
 * @returns {{ tier: string, items: Array, total: number }}
 */
export function computeTierBreakdown(materials, tier) {
  if (!TIERS.includes(tier)) {
    throw new Error(`Unknown tier "${tier}". Must be one of ${TIERS.join(", ")}`);
  }

  const items = materials.map((line) => {
    const unitPrice = unitPriceFor(line, tier);
    const lineCost = round2(line.quantity * unitPrice);
    return {
      id: line.id,
      category: line.category,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice,
      lineCost,
    };
  });

  const total = round2(items.reduce((sum, item) => sum + item.lineCost, 0));

  return { tier, items, total };
}

/**
 * Compute all three tier breakdowns for a project's BOM at once —
 * this is what the UI calls for the side-by-side comparison.
 * @param {MaterialLine[]} materials
 * @returns {Object} keyed by tier name, e.g. { pine: {...}, cedar: {...}, composite: {...} }
 */
export function computeAllTiers(materials) {
  const result = {};
  for (const tier of TIERS) {
    result[tier] = computeTierBreakdown(materials, tier);
  }
  return result;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------
// Example usage (matches the sample BOM in docs/budget-materials.md)
// ---------------------------------------------------------------------
// import { computeAllTiers } from "./materials-engine.js";
//
// const playhouseBOM = [
//   { id: "framing-2x4", category: "framing", unit: "linear_ft", quantity: 48, tiered: true },
//   { id: "decking-boards", category: "decking", unit: "linear_ft", quantity: 32, tiered: true },
//   { id: "deck-screws-3in", category: "fasteners", unit: "box_100", quantity: 1, tiered: false },
//   { id: "corner-brackets", category: "hardware", unit: "each", quantity: 8, tiered: false },
// ];
//
// const result = computeAllTiers(playhouseBOM);
// console.log(result.pine.total, result.cedar.total, result.composite.total);
