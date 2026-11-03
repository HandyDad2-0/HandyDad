import test from "node:test";
import assert from "node:assert/strict";
import {
  fitsTime,
  fitsSkill,
  filterProjects,
  hasActiveFilters,
  formatHours,
  describeFilters,
} from "./libraryFilters.js";

const proj = (id, category, skill_level, min, max) => ({
  id,
  category,
  skill_level,
  build_time_hours: { min, max },
});

const sandbox = proj("sandbox", "kid_structure", "beginner", 2, 3);
const playhouse = proj("playhouse", "kid_structure", "intermediate", 10, 14);
const shed = proj("shed", "chore_easing", "intermediate", 24, 30);
const all = [sandbox, playhouse, shed];

test("time filter: a weekend fits builds up to 16 hours", () => {
  assert.equal(fitsTime(sandbox, "weekend"), true);
  assert.equal(fitsTime(playhouse, "weekend"), true);
  assert.equal(fitsTime(shed, "weekend"), false);
});

test("time filter: a week includes weekend-sized builds too", () => {
  assert.equal(fitsTime(sandbox, "week"), true);
  assert.equal(fitsTime(shed, "week"), true);
  assert.equal(fitsTime(proj("big", "kid_structure", "intermediate", 40, 60), "week"), false);
});

test("time filter: boundary values and 'all'", () => {
  assert.equal(fitsTime(proj("a", "x", "beginner", 10, 16), "weekend"), true);
  assert.equal(fitsTime(proj("b", "x", "beginner", 10, 17), "weekend"), false);
  assert.equal(fitsTime(shed, "all"), true);
  assert.equal(fitsTime(shed, "something-unknown"), true);
});

test("skill filter: first-timer sees beginner only, some experience sees both", () => {
  assert.equal(fitsSkill(sandbox, "beginner"), true);
  assert.equal(fitsSkill(playhouse, "beginner"), false);
  assert.equal(fitsSkill(sandbox, "intermediate"), true);
  assert.equal(fitsSkill(playhouse, "intermediate"), true);
  assert.equal(fitsSkill(playhouse, "all"), true);
});

test("skill filter: an unknown level is never hidden", () => {
  assert.equal(fitsSkill(proj("x", "kid_structure", "advanced", 1, 2), "beginner"), true);
  assert.equal(fitsSkill(sandbox, "advanced"), true);
});

test("filterProjects combines category, time and skill", () => {
  assert.deepEqual(filterProjects(all).map((p) => p.id), ["sandbox", "playhouse", "shed"]);
  assert.deepEqual(filterProjects(all, { time: "weekend" }).map((p) => p.id), ["sandbox", "playhouse"]);
  assert.deepEqual(filterProjects(all, { time: "weekend", skill: "beginner" }).map((p) => p.id), ["sandbox"]);
  assert.deepEqual(filterProjects(all, { category: "chore_easing", skill: "intermediate" }).map((p) => p.id), ["shed"]);
  assert.deepEqual(filterProjects(all, { category: "chore_easing", time: "weekend" }), []);
});

test("hasActiveFilters", () => {
  assert.equal(hasActiveFilters({}), false);
  assert.equal(hasActiveFilters({ category: "all", time: "all", skill: "all" }), false);
  assert.equal(hasActiveFilters({ skill: "beginner" }), true);
});

test("formatHours", () => {
  assert.equal(formatHours({ min: 2, max: 3 }), "2–3 hrs");
  assert.equal(formatHours({ min: 4, max: 4 }), "4 hrs");
  assert.equal(formatHours({ min: 1, max: 1 }), "1 hr");
});

test("describeFilters", () => {
  assert.equal(describeFilters({}), "");
  assert.equal(describeFilters({ time: "weekend" }), "fit a weekend");
  assert.equal(describeFilters({ time: "week", skill: "beginner" }), "fit a week and suit a first-timer");
});
