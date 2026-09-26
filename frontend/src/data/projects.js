// Single source of truth: the real seed project data Austin maintains,
// shaped to Razee's schema (docs/project-schema.md). Do not hand-edit
// project content here — edit /data/seed-projects.json instead.
import seedProjects from "../../../data/seed-projects.json";

export const projects = seedProjects;

export function getProjectById(id) {
  return projects.find((p) => p.id === id) ?? null;
}

export const CATEGORY_LABELS = {
  kid_structure: "Kid Structure",
  chore_easing: "Chore-Easing",
};

export const SKILL_LABELS = {
  beginner: "First-Timer",
  intermediate: "Some Experience",
};

export function timeBucket(project) {
  // R6: "I have a weekend" vs "I have a week" filter, derived from
  // build_time_hours until content explicitly tags a bucket.
  return project.build_time_hours.max <= 16 ? "weekend" : "week";
}
