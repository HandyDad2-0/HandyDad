// Thin wrapper around Razee's materials engine (../../backend/materials-engine.js).
// Most seed projects don't have a real `materials` BOM yet (see
// data/seed-projects.json's `pending_fields`), so this falls back to the
// hand-estimated `budget_estimate_reference` range until Austin fills
// those in. Swap this fallback out once every seed project has a BOM.
import { computeAllTiers, TIERS } from "../../../backend/materials-engine.js";

export { TIERS };

export function getTierBreakdown(project) {
  if (project.materials && project.materials.length > 0) {
    return { source: "computed", tiers: computeAllTiers(project.materials) };
  }

  // Fallback: no BOM yet, use the hand-estimated reference range.
  const ref = project.budget_estimate_reference;
  if (!ref) return { source: "unavailable", tiers: null };

  const tiers = {};
  for (const tier of TIERS) {
    const [min, max] = ref[tier] ?? [null, null];
    tiers[tier] = { tier, items: [], total: null, estimateRange: [min, max] };
  }
  return { source: "estimate", tiers };
}
