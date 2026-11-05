// Schema-validation test for data/seed-projects.json against the schema
// documented in docs/project-schema.md (PR #6). Pairs with Austin, who
// owns this content, and Razee's materials engine / the dimension-fit
// engine, which both assume every project already matches this shape.
//
// This isn't just field-presence checking: it also runs every project's
// real materials array through the materials engine, and every project
// through the dimension-fit engine, so a malformed entry fails here
// instead of throwing at runtime when a user opens that project.
//
// Run just this file with `npm run validate:seed` from the repo root.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeAllTiers } from "../materials-engine.js";
import { checkFit } from "../dimension-fit-engine.js";
import { SKILL_ORDER, TIME_LIMITS, fitsTime } from "../../frontend/src/lib/libraryFilters.js";

const seedProjects = JSON.parse(readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8"));

const CATEGORIES = new Set(["kid_structure", "chore_easing"]);
const SKILL_LEVELS = new Set(SKILL_ORDER); // whatever the R6 skill filter understands
const OBSTACLE_TYPES = new Set(["slope", "tree", "fence_line", "utility_lines"]);
const MATERIAL_CATEGORIES = new Set(["framing", "decking", "fasteners", "hardware", "finish"]);
const KNOWN_PENDING_FIELDS = new Set(["obstacles_relevant", "materials"]);

// Every field a project must carry. budget_estimate_reference is required for
// now because ProjectDetail.jsx reads it unconditionally for the "Budget
// estimate" row; drop it from this list if/when the field is retired
// (see docs/project-schema.md).
const REQUIRED_FIELDS = [
  "id",
  "name",
  "category",
  "skill_level",
  "build_time_hours",
  "footprint",
  "clearance_ft",
  "engineer_review_required",
  "max_unassisted_height_ft",
  "obstacles_relevant",
  "materials",
  "budget_estimate_reference",
  "description",
];
// Optional bookkeeping fields. Anything else is almost certainly a typo
// (e.g. "skill_lvl"), which would otherwise silently fall through the filters.
const OPTIONAL_FIELDS = ["pending_fields", "_note"];
const ALLOWED_FIELDS = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);

function isPositiveNumber(v) {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

test("seed-projects.json is a non-empty array", () => {
  assert.ok(Array.isArray(seedProjects));
  assert.ok(seedProjects.length > 0);
});

test("every project id is a nonempty string, unique across the library", () => {
  const ids = seedProjects.map((p) => p.id);
  for (const id of ids) {
    assert.equal(typeof id, "string");
    assert.ok(id.trim().length > 0);
  }
  assert.equal(new Set(ids).size, ids.length, "project ids must be unique");
});

test("every project name is unique across the library", () => {
  const names = seedProjects.map((p) => p.name);
  assert.equal(new Set(names).size, names.length, "project names must be unique");
});

for (const project of seedProjects) {
  const pending = new Set(project.pending_fields ?? []);

  test(`${project.id}: has every required field and no unknown ones`, () => {
    for (const field of REQUIRED_FIELDS) {
      assert.ok(Object.hasOwn(project, field), `missing required field "${field}"`);
    }
    for (const field of Object.keys(project)) {
      assert.ok(ALLOWED_FIELDS.has(field), `unknown field "${field}" (typo, or update docs/project-schema.md and this test)`);
    }
  });

  test(`${project.id}: matches the project schema`, () => {
    assert.match(project.id, /^(kid|chore)-[a-z0-9]+(-[a-z0-9]+)*$/, "id should be a kid-/chore- prefixed slug");

    assert.equal(typeof project.name, "string");
    assert.ok(project.name.trim().length > 0);

    assert.ok(CATEGORIES.has(project.category), `unknown category "${project.category}"`);
    assert.equal(
      project.id.startsWith("kid-") ? "kid_structure" : "chore_easing",
      project.category,
      "id prefix should match category"
    );

    assert.equal(typeof project.description, "string");
    assert.ok(project.description.trim().length > 0);

    // footprint / clearance — what the dimension-fit engine reads directly
    assert.ok(project.footprint && typeof project.footprint === "object");
    assert.ok(isPositiveNumber(project.footprint.length_ft));
    assert.ok(isPositiveNumber(project.footprint.width_ft));
    assert.ok(isPositiveNumber(project.clearance_ft));

    // engineer review / height threshold
    assert.equal(typeof project.engineer_review_required, "boolean");
    assert.ok(
      project.max_unassisted_height_ft === null || isPositiveNumber(project.max_unassisted_height_ft),
      "max_unassisted_height_ft must be null or a positive number"
    );

    // obstacles_relevant
    assert.ok(Array.isArray(project.obstacles_relevant));
    for (const obstacle of project.obstacles_relevant) {
      assert.ok(OBSTACLE_TYPES.has(obstacle), `unknown obstacle type "${obstacle}"`);
    }
    assert.equal(
      new Set(project.obstacles_relevant).size,
      project.obstacles_relevant.length,
      "obstacles_relevant should not contain duplicates"
    );

    // budget_estimate_reference
    for (const tier of ["pine", "cedar", "composite"]) {
      const range = project.budget_estimate_reference?.[tier];
      assert.ok(Array.isArray(range) && range.length === 2, `budget_estimate_reference.${tier} must be a [min, max] pair`);
      const [min, max] = range;
      assert.ok(isPositiveNumber(min) && isPositiveNumber(max) && min <= max, `budget_estimate_reference.${tier} must be an ascending positive pair`);
    }

    // pending_fields, when present, must name real fields
    if (project.pending_fields != null) {
      assert.ok(Array.isArray(project.pending_fields));
      for (const field of project.pending_fields) {
        assert.ok(KNOWN_PENDING_FIELDS.has(field), `unknown pending_fields entry "${field}"`);
      }
    }
  });

  test(`${project.id}: time and skill tags are usable by the R6 library filters`, () => {
    assert.ok(
      SKILL_LEVELS.has(project.skill_level),
      `skill_level "${project.skill_level}" isn't one the skill filter knows (${SKILL_ORDER.join(", ")})`
    );

    const hours = project.build_time_hours;
    assert.ok(hours && typeof hours === "object");
    assert.ok(isPositiveNumber(hours.min), "build_time_hours.min must be a positive number");
    assert.ok(isPositiveNumber(hours.max), "build_time_hours.max must be a positive number");
    assert.ok(hours.min <= hours.max, "build_time_hours.min must not exceed max");

    // A project longer than the longest time filter would vanish from every
    // time filter except "All".
    assert.ok(
      fitsTime(project, "week"),
      `build_time_hours.max (${hours.max}) is over the "week" filter limit (${TIME_LIMITS.week}), so no time filter would show it`
    );

    // Consistency between the two tags: a first-timer build should fit a
    // weekend. A longer project is a sign the skill tag (or the hours) is off.
    if (project.skill_level === "beginner") {
      assert.ok(
        fitsTime(project, "weekend"),
        `beginner project takes up to ${hours.max} hrs, more than a weekend (${TIME_LIMITS.weekend}); re-check its skill_level or build_time_hours`
      );
    }
  });

  test(`${project.id}: has a bill of materials, and pending_fields is up to date`, () => {
    assert.ok(Array.isArray(project.materials));

    if (pending.has("materials")) {
      assert.equal(project.materials.length, 0, `"materials" is listed in pending_fields but the BOM is filled in; remove it from pending_fields`);
    } else {
      assert.ok(project.materials.length > 0, `project has no BOM; add materials or list "materials" in pending_fields`);
    }

    if (pending.has("obstacles_relevant")) {
      assert.equal(
        project.obstacles_relevant.length,
        0,
        `"obstacles_relevant" is listed in pending_fields but already has values; remove it from pending_fields`
      );
    }

    // shape-check each line, matching materials-engine.js's MaterialLine
    for (const line of project.materials) {
      assert.equal(typeof line.id, "string");
      assert.ok(line.id.trim().length > 0, "material id must be nonempty");
      assert.ok(MATERIAL_CATEGORIES.has(line.category), `unknown material category "${line.category}" in ${line.id}`);
      assert.equal(typeof line.unit, "string");
      assert.equal(typeof line.quantity, "number");
      assert.ok(Number.isFinite(line.quantity) && line.quantity > 0, `${line.id} has an invalid quantity (must be > 0)`);
      assert.equal(typeof line.tiered, "boolean");
    }
    const materialIds = project.materials.map((line) => line.id);
    assert.equal(new Set(materialIds).size, materialIds.length, "a material id should appear only once per BOM; combine the quantities");
  });

  test(`${project.id}: materials run through the real pricing engine without throwing`, () => {
    if (project.materials.length === 0) return; // nothing to price yet; covered by materials-engine.test.js's empty-BOM case
    assert.doesNotThrow(() => computeAllTiers(project.materials));
  });

  test(`${project.id}: runs through the real dimension-fit engine without throwing, for both a fitting and a too-small space`, () => {
    const fittingInput = {
      length_ft: project.footprint.length_ft,
      width_ft: project.footprint.width_ft,
      clearance_ft: project.clearance_ft,
      entered_height_ft: project.max_unassisted_height_ft != null ? project.max_unassisted_height_ft : null,
      sloped: false,
      attachedToStructure: false,
      hasTree: false,
      hasFenceLine: false,
      hasUtilityLines: false,
    };
    assert.doesNotThrow(() => checkFit(project, fittingInput));

    const tooSmallInput = { ...fittingInput, length_ft: 0.1, width_ft: 0.1, clearance_ft: 0.1 };
    const result = checkFit(project, tooSmallInput);
    assert.equal(result.hasBlockingFlags, true, "a space far smaller than the footprint should always block");
  });
}
