import { projectsById } from "./projectCatalog.js";

const SOURCE_FILE = "data/seed-projects.json";

function citation(project, field, label) {
  return { source: SOURCE_FILE, projectId: project.id, field, label };
}

function humanizeMaterial(id) {
  return id.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cannotVerify(projectId, message) {
  return { projectId, status: "cannot_verify", answer: null, message, sources: [] };
}

function isAny(question, expressions) {
  return expressions.some((expression) => expression.test(question));
}

/** Answers only from approved selected-project fields; no generated DIY advice. */
export function answerQuestion(project, rawQuestion) {
  const question = rawQuestion.toLowerCase();

  if (isAny(question, [/\b(permit|code|zoning|setback|inspect(?:ion|or)?|legal)\b/, /\b(electric|wiring|plumb(?:ing|er))\b/, /\b(safe|safety|load[ -]?bearing|structural|support|replace|substitut|change.*(frame|post|beam))\b/])) {
    return cannotVerify(project.id, "This question cannot be verified from the approved HandyDad project data. Check applicable local requirements or a qualified professional for safety, structural, electrical, plumbing, or code decisions.");
  }

  if (isAny(question, [/\b(materials?|lumber|wood|screw|fastener|hardware|supply|supplies)\b/])) {
    const materials = project.materials.map((material) => `${material.quantity} ${material.unit} of ${humanizeMaterial(material.id)}`);
    return { projectId: project.id, status: "verified", answer: `The approved catalog lists: ${materials.join("; ")}.`, sources: [citation(project, "materials", "Approved materials list")] };
  }

  if (isAny(question, [/\b(dimension|size|wide|width|long|length|footprint|clearance|space|fit)\b/])) {
    const { length_ft, width_ft } = project.footprint;
    return { projectId: project.id, status: "verified", answer: `The approved catalog footprint is ${length_ft} ft by ${width_ft} ft, with ${project.clearance_ft} ft of required clearance. This does not verify fit for a specific site.`, sources: [citation(project, "footprint", "Approved project footprint"), citation(project, "clearance_ft", "Approved clearance requirement")] };
  }

  if (isAny(question, [/\b(time|long|hours?|difficulty|skill|beginner|intermediate|what is|about)\b/])) {
    return { projectId: project.id, status: "verified", answer: `${project.description} The catalog rates it ${project.skill_level} and estimates ${project.build_time_hours.min}-${project.build_time_hours.max} hours.`, sources: [citation(project, "description", "Approved project description"), citation(project, "skill_level", "Approved skill level"), citation(project, "build_time_hours", "Approved estimated build time")] };
  }

  return cannotVerify(project.id, "This question cannot be verified from the approved HandyDad project data.");
}

export function handleQuestion(req, res) {
  const { projectId, question } = req.body ?? {};
  if (typeof projectId !== "string" || !projectId.trim() || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ code: "INVALID_QUESTION", message: "projectId and question must be nonempty strings." });
  }
  const project = projectsById.get(projectId);
  if (!project) {
    return res.status(404).json({ code: "PROJECT_NOT_FOUND", message: "The selected project was not found." });
  }
  return res.status(200).json(answerQuestion(project, question));
}
