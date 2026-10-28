import { readFileSync } from "node:fs";
import { checkFit } from "../dimension-fit-engine.js";

const projects = JSON.parse(readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8"));
const projectsById = new Map(projects.map((project) => [project.id, project]));

// Generous upper bounds on a residential yard/room — anything past these is
// almost certainly a bad input (unit confusion, typo) rather than a real
// space, so we reject with a clear error instead of silently computing on it.
const MAX_DIMENSION_FT = 1000;
const MAX_HEIGHT_FT = 200;

const OBSTACLE_FIELDS = ["sloped", "attachedToStructure", "hasTree", "hasFenceLine", "hasUtilityLines"];

function isValidDimension(value, max) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max;
}

/**
 * POST /api/dimension-fit
 * Body: { projectId, length_ft, width_ft, clearance_ft, entered_height_ft?, obstacles? }
 * obstacles: { sloped?, attachedToStructure?, hasTree?, hasFenceLine?, hasUtilityLines? }
 * -> { flags, hasBlockingFlags } (see dimension-fit-engine.js for the shape of each flag)
 */
export function handleDimensionFit(req, res) {
  const body = req.body ?? {};
  const { projectId, length_ft, width_ft, clearance_ft, entered_height_ft, obstacles } = body;

  if (typeof projectId !== "string" || !projectId.trim()) {
    return res.status(400).json({
      code: "INVALID_PROJECT_ID",
      message: "projectId must be a nonempty string.",
    });
  }

  const project = projectsById.get(projectId);
  if (!project) {
    return res.status(404).json({
      code: "PROJECT_NOT_FOUND",
      message: "The selected project was not found.",
    });
  }

  const badFields = [];
  if (!isValidDimension(length_ft, MAX_DIMENSION_FT)) badFields.push("length_ft");
  if (!isValidDimension(width_ft, MAX_DIMENSION_FT)) badFields.push("width_ft");
  if (!isValidDimension(clearance_ft, MAX_DIMENSION_FT)) badFields.push("clearance_ft");

  if (badFields.length > 0) {
    return res.status(400).json({
      code: "INVALID_DIMENSIONS",
      message: `length_ft, width_ft, and clearance_ft must each be a finite number greater than 0 and at most ${MAX_DIMENSION_FT} (invalid: ${badFields.join(", ")}).`,
      fields: badFields,
    });
  }

  // entered_height_ft is only required when this project has a Rule 3
  // threshold to check it against — mirrors the frontend's needsHeight logic.
  const needsHeight = project.max_unassisted_height_ft != null;
  let heightFt = null;
  if (needsHeight) {
    if (!isValidDimension(entered_height_ft, MAX_HEIGHT_FT)) {
      return res.status(400).json({
        code: "INVALID_HEIGHT",
        message: `This project needs entered_height_ft: a finite number greater than 0 and at most ${MAX_HEIGHT_FT}.`,
        fields: ["entered_height_ft"],
      });
    }
    heightFt = entered_height_ft;
  } else if (entered_height_ft != null) {
    if (!isValidDimension(entered_height_ft, MAX_HEIGHT_FT)) {
      return res.status(400).json({
        code: "INVALID_HEIGHT",
        message: `entered_height_ft must be a finite number greater than 0 and at most ${MAX_HEIGHT_FT}.`,
        fields: ["entered_height_ft"],
      });
    }
    heightFt = entered_height_ft;
  }

  const obstacleInput = obstacles ?? {};
  const badObstacleFields = OBSTACLE_FIELDS.filter(
    (field) => obstacleInput[field] != null && typeof obstacleInput[field] !== "boolean"
  );
  if (badObstacleFields.length > 0) {
    return res.status(400).json({
      code: "INVALID_OBSTACLES",
      message: `obstacles fields must be booleans when present (invalid: ${badObstacleFields.join(", ")}).`,
      fields: badObstacleFields,
    });
  }

  const result = checkFit(project, {
    length_ft,
    width_ft,
    clearance_ft,
    entered_height_ft: heightFt,
    sloped: obstacleInput.sloped ?? false,
    attachedToStructure: obstacleInput.attachedToStructure ?? false,
    hasTree: obstacleInput.hasTree ?? false,
    hasFenceLine: obstacleInput.hasFenceLine ?? false,
    hasUtilityLines: obstacleInput.hasUtilityLines ?? false,
  });

  return res.json(result);
}
