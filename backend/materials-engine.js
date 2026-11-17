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
// Sourcing status. Full citations (store, product, model, date) are in the
// sources table in docs/budget-materials.md. All prices are Home Depot,
// North Denton TX (76201).
//   framing.pine      - 2x4 Prime Whitewood Stud, $3.72 / 7.72 ft, Nov 17, 2026
//   framing.cedar     - average of 2x4x8 ($23.98) and 2x4x12 ($34.98) Rough
//                       Green Western Red Cedar, Nov 17, 2026
//   framing.composite - same as pine. Composite lumber is sold as decking,
//                       not structural framing, so the composite tier is
//                       pine framing under composite decking.
//   decking.pine      - Sep 19, 2026
//   decking.cedar     - Sep 26, 2026 (older than the others; recheck)
//   decking.composite - Trex Enhance Naturals 1x6x16, $37.42 / 16 ft, Nov 17, 2026
//
// Resulting tier order for any project with decking: pine < composite < cedar.
// (Composite decking is cheaper than cedar decking at retail; composite is
// the low-maintenance option, not the most expensive one.)
export const PRICE_CATALOG = {
  framing: { pine: 0.48, cedar: 2.96, composite: 0.48 }, // $/linear_ft
  decking: { pine: 0.95, cedar: 3.89, composite: 2.34 }, // $/linear_ft
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
    if (typeof line.quantity !== "number" || !Number.isFinite(line.quantity) || line.quantity < 0) {
      throw new Error(
        `Invalid quantity for material "${line.id}": must be a finite number >= 0 (got ${line.quantity})`
      );
    }
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
