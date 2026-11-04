import { projects } from "./projectCatalog.js";

// Discovery scoring only: it is not a safety, fit, or build-feasibility score.
export const MATCH_THRESHOLD = 25;
export const MAX_MATCHES = 3;

const STOP_WORDS = new Set("i me my we our want need would like build make create project something a an the for to of and or with in on at is it that this some small large wooden wood outdoor backyard please can could have".split(" "));
const ALIASES = {
  children: "kid", child: "kid", kids: "kid", logs: "firewood", log: "firewood",
  garbage: "trash", rubbish: "trash", rubbishbin: "bin", vegetables: "garden",
  vegetable: "garden", gardening: "garden", planter: "garden", swings: "swing",
  composting: "compost", recycling: "recycle", recycled: "recycle"
};

export function ideaTokens(text) {
  if (typeof text !== "string") return [];
  return [...new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((word) => !STOP_WORDS.has(word) && word.length > 1)
    .map((word) => ALIASES[word] ?? (word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word)))];
}

function publicProject(project) {
  return { id: project.id, name: project.name, category: project.category, skillLevel: project.skill_level, description: project.description };
}

export function matchProjects(idea, catalog = projects) {
  const query = ideaTokens(idea);
  if (!query.length) return [];

  return catalog.map((project) => {
    const title = new Set(ideaTokens(project.name));
    const content = new Set(ideaTokens(`${project.name} ${project.description} ${(project.tags ?? []).join(" ")}`));
    const matchedTerms = query.filter((term) => content.has(term));
    const weight = matchedTerms.reduce((sum, term) => sum + (title.has(term) ? 1 : 0.5), 0);
    return { project: publicProject(project), matchPercentage: Math.round((100 * weight) / query.length), matchedTerms };
  }).filter((result) => result.matchPercentage >= MATCH_THRESHOLD)
    .sort((a, b) => b.matchPercentage - a.matchPercentage || a.project.name.localeCompare(b.project.name));
}

export function handleProjectMatch(req, res) {
  const { description } = req.body ?? {};
  if (typeof description !== "string" || !description.trim() || description.trim().length > 1000) {
    return res.status(400).json({
      code: "INVALID_DESCRIPTION",
      message: "description must be a nonempty string of at most 1000 characters."
    });
  }

  const matches = matchProjects(description).slice(0, MAX_MATCHES).map((match) => ({
    projectId: match.project.id,
    matchPercent: match.matchPercentage,
    reason: `Matches: ${match.matchedTerms.join(", ")}`
  }));
  return res.status(200).json({
    description: description.trim(),
    matches,
    noMatch: matches.length === 0
  });
}
