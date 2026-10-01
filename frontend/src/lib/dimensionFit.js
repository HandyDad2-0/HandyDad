// Dimension-Fit Rules Engine
// Owner: Anish Jaiswal
//
// Implements Austin's "Basic Safety/Complication Flagging Rules — First
// Draft" (docs/Basic Safety Complication Flagging Rules — First Draft.docx)
// against the user's entered space, plus one additional advisory
// (attached-to-structure / load-bearing) from docs/space-measurement.md
// that isn't in Austin's four-rule draft yet.
//
// Resolved with Austin: this module is the single implementation of the
// flagging rules — his doc is the spec, not a separate code path. Key
// behavior per his spec (different from this module's first draft):
// none of these checks block the user from seeing the materials list.
// Rule 1/2 ("blocking" severity) means "shown as a red flag", not
// "stop the flow" — S-06 always renders, flags or no flags.
//
// NOTE: project.footprint.*_ft / clearance_ft are stored directly in
// feet in data/seed-projects.json, not a single internal base unit (cm)
// as docs/space-measurement.md's units decision specifies. Flagged on
// PR #6's review, still unresolved upstream — this engine reads the
// schema as it currently exists on disk.

const OBSTACLE_LABELS = {
  slope: "slope",
  tree: "tree",
  fence_line: "fence line",
  utility_lines: "utility lines",
};

/**
 * @param {Object} project - a project from data/seed-projects.json
 * @param {Object} input
 * @param {number} input.length_ft
 * @param {number} input.width_ft
 * @param {number} input.clearance_ft
 * @param {number|null} [input.entered_height_ft] - only meaningful when the
 *   project has a max_unassisted_height_ft threshold (Rule 3)
 * @param {boolean} input.sloped
 * @param {boolean} input.attachedToStructure
 * @param {boolean} input.hasTree
 * @param {boolean} input.hasFenceLine
 * @param {boolean} input.hasUtilityLines
 * @returns {{ flags: Array<{ rule: string, severity: "blocking"|"advisory"|"advisory-strong", text: string }>, hasBlockingFlags: boolean }}
 */
export function checkFit(project, input) {
  const flags = [];

  // Rule 3 - No Engineer Needed. Shown first: lower severity than Rules 1/2
  // but the highest safety stakes, per Austin's proposed ordering.
  const heightExceedsThreshold =
    project.max_unassisted_height_ft != null &&
    input.entered_height_ft != null &&
    input.entered_height_ft > project.max_unassisted_height_ft;
  if (project.engineer_review_required || heightExceedsThreshold) {
    flags.push({
      rule: "engineer_review",
      severity: "advisory",
      text: "This build involves structural work that typically needs a permit or engineer sign-off - check your local codes before starting.",
    });
  }

  // Load-bearing / attached-to-structure. Not one of Austin's four rules —
  // grounded in docs/space-measurement.md's "flag for manual verification"
  // guidance for builds tied into an existing structure.
  if (input.attachedToStructure) {
    flags.push({
      rule: "attached_to_structure",
      severity: "advisory",
      text: "You noted this build attaches to an existing structure (deck, wall, or roof). Load-bearing capacity needs manual verification before building.",
    });
  }

  // Rule 1 - Fits in Space
  const fitsFootprint =
    input.length_ft >= project.footprint.length_ft &&
    input.width_ft >= project.footprint.width_ft;
  if (!fitsFootprint) {
    flags.push({
      rule: "fits_in_space",
      severity: "blocking",
      text: `This project needs about ${project.footprint.length_ft} x ${project.footprint.width_ft} ft - your space is ${input.length_ft} x ${input.width_ft} ft. It may not fit as designed.`,
    });
  }

  // Rule 2 - Has Clearance
  const fitsClearance = input.clearance_ft >= project.clearance_ft;
  if (!fitsClearance) {
    flags.push({
      rule: "has_clearance",
      severity: "blocking",
      text: `This project needs ${project.clearance_ft} ft of clearance to build and use safely - you entered ${input.clearance_ft} ft.`,
    });
  }

  // Rule 4 - Obstacle Conflict. Only obstacles the project actually lists as
  // relevant trigger a flag. Utility lines get a stronger flag treatment
  // than the other three, per Austin's doc ("call-before-you-dig applies
  // regardless of what HandyDad says").
  const checkedObstacles = [
    input.sloped && "slope",
    input.hasTree && "tree",
    input.hasFenceLine && "fence_line",
    input.hasUtilityLines && "utility_lines",
  ].filter(Boolean);

  for (const obstacle of checkedObstacles) {
    if (!project.obstacles_relevant?.includes(obstacle)) continue;
    flags.push({
      rule: "obstacle_conflict",
      severity: obstacle === "utility_lines" ? "advisory-strong" : "advisory",
      text: `You noted a ${OBSTACLE_LABELS[obstacle]} in this area - double check it won't interfere with the build.`,
    });
  }

  return {
    flags,
    hasBlockingFlags: flags.some((f) => f.severity === "blocking"),
  };
}
