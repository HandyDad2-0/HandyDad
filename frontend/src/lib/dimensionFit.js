// Dimension-Fit Rules Engine
// Owner: Anish Jaiswal
//
// Checks a chosen project's footprint/clearance against the user's
// entered space, and raises plain-language complications for slope,
// load-bearing risk, and known obstacles. See docs/space-measurement.md
// for the full input flow and the rationale behind each rule.
//
// NOTE: project.footprint.*_ft / clearance_ft are stored directly in
// feet in data/seed-projects.json, not converted to a single internal
// base unit (centimeters) as docs/space-measurement.md's units decision
// specifies. Flagged on PR #6's review — not yet resolved upstream, so
// this engine reads the schema as it currently exists on disk.

/**
 * @param {Object} project - a project from data/seed-projects.json
 * @param {Object} input
 * @param {number} input.length_ft
 * @param {number} input.width_ft
 * @param {number} input.clearance_ft
 * @param {boolean} input.sloped
 * @param {boolean} input.attachedToStructure
 * @param {boolean} input.hasTree
 * @param {boolean} input.hasFenceLine
 * @param {boolean} input.hasUtilityLines
 * @returns {{ fits: boolean, complications: string[] }}
 */
export function checkFit(project, input) {
  const fitsFootprint =
    input.length_ft >= project.footprint.length_ft &&
    input.width_ft >= project.footprint.width_ft;
  if (!fitsFootprint) {
    return {
      fits: false,
      complications: [
        `Your space (${input.length_ft}×${input.width_ft} ft) is smaller than this project's ${project.footprint.length_ft}×${project.footprint.width_ft} ft footprint.`,
      ],
    };
  }

  const fitsClearance = input.clearance_ft >= project.clearance_ft;
  if (!fitsClearance) {
    return {
      fits: false,
      complications: [
        `This project needs ${project.clearance_ft} ft of clearance; you entered ${input.clearance_ft} ft.`,
      ],
    };
  }

  const complications = [];

  // Slope: flag rather than compute a precise grade (docs/space-measurement.md §2).
  if (input.sloped) {
    complications.push(
      "You noted sloped ground. This design may need extra bracing or leveling posts — confirm before buying materials."
    );
  }

  // Load-bearing: flag for manual verification, not an automated calculation
  // (docs/space-measurement.md §2 — "this is a safety-relevant judgment call").
  if (input.attachedToStructure) {
    complications.push(
      "You noted this build attaches to an existing structure (deck, wall, or roof). Load-bearing capacity needs manual verification before building — HandyDad can't calculate that for you."
    );
  }

  if (input.hasTree && project.obstacles_relevant?.includes("tree")) {
    complications.push(
      "You noted a tree in the area. Confirm the trunk and major limbs are healthy and thick enough to bear weight before attaching anything."
    );
  }
  if (input.hasFenceLine) {
    complications.push(
      "You noted a nearby fence line. Confirm your local property-line setback distance before finalizing placement."
    );
  }
  if (input.hasUtilityLines) {
    complications.push(
      "You noted known utility lines nearby. Confirm their exact location before any digging or post-setting."
    );
  }

  if (project.engineer_review_required) {
    complications.push(
      "This project involves a structural element (elevated deck, retaining wall, or tie-in) that should be reviewed for load-bearing safety before building."
    );
  }
  if (project.max_unassisted_height_ft != null) {
    complications.push(
      `This build reaches ${project.max_unassisted_height_ft} ft unassisted — plan for a second person or extra bracing when raising it.`
    );
  }

  return { fits: true, complications };
}
