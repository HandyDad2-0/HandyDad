/**
 * Dimension-Fit Rules Engine
 * Owner: Anish Jaiswal
 *
 * Implements Austin's "Basic Safety/Complication Flagging Rules — First
 * Draft" (docs/Basic Safety Complication Flagging Rules — First Draft.docx)
 * against the user's entered space, plus one additional advisory
 * (attached-to-structure / load-bearing) from docs/space-measurement.md
 * that isn't in Austin's four-rule draft yet.
 *
 * Resolved with Austin: this module is the single implementation of the
 * flagging rules — his doc is the spec, not a separate code path. Key
 * behavior per his spec: none of these checks block the user from seeing
 * the materials list. "blocking" severity means "shown as a red flag",
 * not "stop the flow" — the frontend always renders, flags or no flags.
 *
 * Previously lived in frontend/src/lib/dimensionFit.js as its own copy;
 * moved here and exposed through POST /api/dimension-fit (see server.js
 * and lib/dimensionFitHandler.js) so the frontend no longer carries a
 * duplicate of this logic — see Trello "Dimension-fit API endpoint and
 * input validation."
 *
 * NOTE: project.footprint.*_ft / clearance_ft are stored directly in
 * feet in data/seed-projects.json, not a single internal base unit (cm)
 * as docs/space-measurement.md's units decision specifies. Flagged on
 * PR #6's review, still unresolved upstream — this engine reads the
 * schema as it currently exists on disk.
 */

const OBSTACLE_LABELS = {
  slope: "slope",
  tree: "tree",
  fence_line: "fence line",
  utility_lines: "utility lines",
};

// Plain-language "what to do about it" for each obstacle, shown alongside
// the flag text. Utility lines gets a concrete, specific action (call
// 811) rather than a vague "double check" — digging near a line is the
// one obstacle here with a real safety consequence, not just a design one.
const OBSTACLE_NEXT_STEPS = {
  slope: "Walk the spot again with this in mind before you commit to it - a slope can change how stable the build feels.",
  tree: "Walk the spot again with this in mind before you commit to it - roots or branches can get in the way as the project goes in.",
  fence_line: "Walk the spot again with this in mind before you commit to it - check it won't crowd the fence or a neighbor's side.",
  utility_lines: "Call 811 (or your local utility locator) to get lines marked before you dig.",
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
 * @returns {{ flags: Array<{ rule: string, severity: "blocking"|"advisory"|"advisory-strong", text: string, nextStep: string }>, hasBlockingFlags: boolean }}
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
      text: "This build involves structural work that typically needs a permit or engineer sign-off.",
      nextStep: "Check with your local building department, or have a licensed engineer sign off, before you start.",
    });
  }

  // Load-bearing / attached-to-structure. Not one of Austin's four rules —
  // grounded in docs/space-measurement.md's "flag for manual verification"
  // guidance for builds tied into an existing structure.
  if (input.attachedToStructure) {
    flags.push({
      rule: "attached_to_structure",
      severity: "advisory",
      text: "You noted this build attaches to an existing structure (deck, wall, or roof).",
      nextStep: "Before attaching anything, have someone confirm the structure can safely hold the extra weight.",
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
      text: `This project needs about ${project.footprint.length_ft} x ${project.footprint.width_ft} ft - your space is ${input.length_ft} x ${input.width_ft} ft, so it may not fit as designed.`,
      nextStep: "Try a smaller version of this project, or pick one with a smaller footprint.",
    });
  }

  // Rule 2 - Has Clearance
  const fitsClearance = input.clearance_ft >= project.clearance_ft;
  if (!fitsClearance) {
    flags.push({
      rule: "has_clearance",
      severity: "blocking",
      text: `This project needs ${project.clearance_ft} ft of clearance to build and use safely - you entered ${input.clearance_ft} ft.`,
      nextStep: "Choose a spot with more room around it, or pick a project that needs less clearance.",
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
      text: `You noted a ${OBSTACLE_LABELS[obstacle]} in this area, which can interfere with this build.`,
      nextStep: OBSTACLE_NEXT_STEPS[obstacle],
    });
  }

  return {
    flags,
    hasBlockingFlags: flags.some((f) => f.severity === "blocking"),
  };
}
