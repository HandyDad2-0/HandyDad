// Schema-validation test for data/seed-projects.json against the schema
// documented in docs/project-schema.md (PR #6). Pairs with Austin, who
// owns this content, and Razee's materials engine / the dimension-fit
// engine, which both assume every project already matches this shape.
//
// This isn't just field-presence checking: it also runs every project's
// real materials array through the materials engine, and every project
// through the dimension-fit engine, so a malformed entry fails here
// instead of throwing at runtime when a user opens that project.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeAllTiers } from "../materials-engine.js";
import { checkFit } from "../dimension-fit-engine.js";

const seedProjects = JSON.parse(readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8"));

const CATEGORIES = new Set(["kid_structure", "chore_easing"]);
const SKILL_LEVELS = new Set(["beginner", "intermediate"]);
const OBSTACLE_TYPES = new Set(["slope", "tree", "fence_line", "utility_lines"]);
const MATERIAL_CATEGORIES = new Set(["framing", "decking", "fasteners", "hardware", "finish"]);
const KNOWN_PENDING_FIELDS = new Set(["obstacles_relevant", "materials"]);

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

for (const project of seedProjects) {
  test(`${project.id}: matches the project schema`, () => {
    assert.equal(typeof project.name, "string");
    assert.ok(project.name.trim().length > 0);

    assert.ok(CATEGORIES.has(project.category), `unknown category "${project.category}"`);
    assert.ok(SKILL_LEVELS.has(project.skill_level), `unknown skill_level "${project.skill_level}"`);

    assert.equal(typeof project.description, "string");
    assert.ok(project.description.trim().length > 0);

    // build_time_hours
    assert.ok(project.build_time_hours && typeof project.build_time_hours === "object");
    assert.ok(isPositiveNumber(project.build_time_hours.min));
    assert.ok(isPositiveNumber(project.build_time_hours.max));
    assert.ok(project.build_time_hours.min <= project.build_time_hours.max);

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

    // materials — shape-check each line, matching materials-engine.js's MaterialLine
    assert.ok(Array.isArray(project.materials));
    for (const line of project.materials) {
      assert.equal(typeof line.id, "string");
      assert.ok(MATERIAL_CATEGORIES.has(line.category), `unknown material category "${line.category}" in ${line.id}`);
      assert.equal(typeof line.unit, "string");
      assert.equal(typeof line.quantity, "number");
      assert.ok(Number.isFinite(line.quantity) && line.quantity >= 0, `${line.id} has an invalid quantity`);
      assert.equal(typeof line.tiered, "boolean");
    }

    // budget_estimate_reference, when present
    if (project.budget_estimate_reference != null) {
      for (const tier of ["pine", "cedar", "composite"]) {
        const range = project.budget_estimate_reference[tier];
        assert.ok(Array.isArray(range) && range.length === 2, `budget_estimate_reference.${tier} must be a [min, max] pair`);
        const [min, max] = range;
        assert.ok(isPositiveNumber(min) && isPositiveNumber(max) && min <= max, `budget_estimate_reference.${tier} must be an ascending positive pair`);
      }
    }

    // pending_fields, when present, must name real fields
    if (project.pending_fields != null) {
      assert.ok(Array.isArray(project.pending_fields));
      for (const field of project.pending_fields) {
        assert.ok(KNOWN_PENDING_FIELDS.has(field), `unknown pending_fields entry "${field}"`);
      }
    }
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
