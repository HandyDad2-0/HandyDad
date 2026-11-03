import { readFileSync } from "node:fs";
import { computeAllTiers, TIERS } from "../materials-engine.js";

// Project data lives in data/seed-projects.json (Austin owns the content,
// docs/project-schema.md defines the shape). It is read once at startup,
// same as lib/dimensionFitHandler.js, so a content edit needs a server restart.
const projects = JSON.parse(readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8"));
const projectsById = new Map(projects.map((project) => [project.id, project]));

/**
 * Build the materials/cost response for one project. Mirrors the logic the
 * frontend runs today in frontend/src/lib/materials.js, so the two stay
 * interchangeable:
 *   - project has a BOM            -> source "computed", tiers from the engine
 *   - no BOM but a reference range -> source "estimate", totals are null and
 *                                     each tier carries estimateRange [min, max]
 *   - neither                      -> source "unavailable", tiers null
 * Throws if the engine can't price a BOM line (unknown category/unit).
 */
export function buildMaterialsResponse(project) {
  if (Array.isArray(project.materials) && project.materials.length > 0) {
    return { projectId: project.id, source: "computed", tiers: computeAllTiers(project.materials) };
  }

  const ref = project.budget_estimate_reference;
  if (!ref) return { projectId: project.id, source: "unavailable", tiers: null };

  const tiers = {};
  for (const tier of TIERS) {
    const [min, max] = ref[tier] ?? [null, null];
    tiers[tier] = { tier, items: [], total: null, estimateRange: [min, max] };
  }
  return { projectId: project.id, source: "estimate", tiers };
}

/** GET /api/projects -> { projects } */
export function handleListProjects(req, res) {
  res.json({ projects });
}

/** GET /api/projects/:id -> the project record, or 404 */
export function handleGetProject(req, res) {
  const project = projectsById.get(req.params.id);
  if (!project) {
    return res.status(404).json({ code: "PROJECT_NOT_FOUND", message: "The selected project was not found." });
  }
  res.json(project);
}

/** GET /api/projects/:id/materials -> { projectId, source, tiers }, or 404 / 500 */
export function handleGetProjectMaterials(req, res) {
  const project = projectsById.get(req.params.id);
  if (!project) {
    return res.status(404).json({ code: "PROJECT_NOT_FOUND", message: "The selected project was not found." });
  }
  try {
    res.json(buildMaterialsResponse(project));
  } catch (error) {
    // A BOM the engine can't price is a data problem, not a client error.
    res.status(500).json({
      code: "MATERIALS_UNPRICEABLE",
      message: `Could not compute costs for this project: ${error.message}`,
    });
  }
}
