// Project Library filtering (R6: time commitment + skill level).
//
// Pure functions with no imports so they can be unit tested with
// `node --test` and reused by other screens (e.g. Describe Your Idea matches).
//
// Time and skill are "what fits me" filters, not exact-match filters:
// someone with a week can also do a weekend build, and someone with some
// experience can also do a first-timer build. Category stays exact-match.

// Longest build_time_hours.max that still fits. A weekend is two days of
// roughly 8 hours; a week is five such days.
export const TIME_LIMITS = { weekend: 16, week: 40 };

// Lowest to highest. A skill filter includes its own level and everything below.
export const SKILL_ORDER = ["beginner", "intermediate"];

export function fitsTime(project, time) {
  if (time === "all") return true;
  const limit = TIME_LIMITS[time];
  if (limit === undefined) return true;
  return project.build_time_hours.max <= limit;
}

export function fitsSkill(project, skill) {
  if (skill === "all") return true;
  const wanted = SKILL_ORDER.indexOf(skill);
  const needed = SKILL_ORDER.indexOf(project.skill_level);
  // Unknown level on either side: don't hide the project.
  if (wanted === -1 || needed === -1) return true;
  return needed <= wanted;
}

export function filterProjects(projects, { category = "all", time = "all", skill = "all" } = {}) {
  return projects.filter(
    (p) =>
      (category === "all" || p.category === category) && fitsTime(p, time) && fitsSkill(p, skill)
  );
}

export function hasActiveFilters({ category = "all", time = "all", skill = "all" } = {}) {
  return category !== "all" || time !== "all" || skill !== "all";
}

// "2–3 hrs" / "4 hrs" for cards and the live summary.
export function formatHours({ min, max }) {
  const unit = max === 1 ? "hr" : "hrs";
  return min === max ? `${max} ${unit}` : `${min}–${max} ${unit}`;
}

// Short plain-language description of the active time/skill filters, e.g.
// "that fit a weekend and suit a first-timer".
export function describeFilters({ time = "all", skill = "all" } = {}) {
  const parts = [];
  if (time === "weekend") parts.push("fit a weekend");
  if (time === "week") parts.push("fit a week");
  if (skill === "beginner") parts.push("suit a first-timer");
  if (skill === "intermediate") parts.push("suit someone with some experience");
  return parts.join(" and ");
}
