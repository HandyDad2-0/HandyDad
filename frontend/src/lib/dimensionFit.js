// TEMPORARY placeholder — Anish owns the real dimension-fit rules engine
// (Trello: "Anish — Review Schema & Build Dimension-Fit Engine", still
// in Sprint To Do as of this scaffold). This implements just enough of
// the algorithm already documented in docs/space-measurement.md (fit
// check + slope/obstacle advisories) so the frontend flow works end to
// end. Replace this module's internals with Anish's real engine when
// it lands — the function signature below is intended to stay stable
// so screens don't need to change.

/**
 * @param {Object} project - a project from data/seed-projects.json
 * @param {Object} input
 * @param {number} input.length_ft
 * @param {number} input.width_ft
 * @param {number} input.clearance_ft
 * @param {boolean} input.sloped
 * @param {boolean} input.hasTree
 * @param {boolean} input.hasFenceLine
 * @param {boolean} input.hasUtilityLines
 * @returns {{ fits: boolean, complications: string[] }}
 */
export function checkFit(project, input) {
  const complications = [];

  const fitsFootprint =
    input.length_ft >= project.footprint.length_ft &&
    input.width_ft >= project.footprint.width_ft;
  const fitsClearance = input.clearance_ft >= project.clearance_ft;

  if (!fitsFootprint) {
    return {
      fits: false,
      complications: [
        `Your space (${input.length_ft}×${input.width_ft} ft) is smaller than this project's ${project.footprint.length_ft}×${project.footprint.width_ft} ft footprint.`,
      ],
    };
  }
  if (!fitsClearance) {
    return {
      fits: false,
      complications: [
        `This project needs ${project.clearance_ft} ft of clearance; you entered ${input.clearance_ft} ft.`,
      ],
    };
  }

  // Per docs/space-measurement.md: flag rather than compute a precise grade.
  if (input.sloped) {
    complications.push(
      "You noted sloped ground. This design may need extra bracing or leveling posts — confirm before buying materials."
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

  return { fits: true, complications };
}
