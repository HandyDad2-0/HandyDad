import { readFileSync } from "node:fs";

const projects = JSON.parse(readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8"));
const projectIds = new Set(projects.map((project) => project.id));

/** Sprint 1 contract only: no model, retrieval, or generated build advice. */
export function handleQuestion(req, res) {
  const { projectId, question } = req.body ?? {};

  if (typeof projectId !== "string" || !projectId.trim() ||
      typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      code: "INVALID_QUESTION",
      message: "projectId and question must be nonempty strings."
    });
  }

  if (!projectIds.has(projectId)) {
    return res.status(404).json({
      code: "PROJECT_NOT_FOUND",
      message: "The selected project was not found."
    });
  }

  return res.status(501).json({
    code: "QA_NOT_IMPLEMENTED",
    message: "Build question answers are not available yet.",
    projectId,
    answer: null,
    sources: []
  });
}
