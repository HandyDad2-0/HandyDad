// Fit tests for every project in the library (Trello: "Space check edge
// cases and clearer results"). dimensionFitEngine.test.js already covers
// the rules in depth on a handful of hand-picked projects; this file's job
// is breadth - the same core scenarios run against all 18 seed projects,
// plus the odd/edge inputs (tiny, very large, zero, missing) the card asks
// for by name.
//
// seedProjectsSchema.test.js already runs each project through checkFit
// once as a smoke test ("doesn't throw"). This file checks the actual
// flagging behavior is correct, not just that it doesn't crash.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkFit } from "../dimension-fit-engine.js";

const seedProjects = JSON.parse(readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8"));

const baseInput = {
  length_ft: 0,
  width_ft: 0,
  clearance_ft: 0,
  entered_height_ft: null,
  sloped: false,
  attachedToStructure: false,
  hasTree: false,
  hasFenceLine: false,
  hasUtilityLines: false,
};

const OBSTACLE_INPUT_FIELD = {
  slope: "sloped",
  tree: "hasTree",
  fence_line: "hasFenceLine",
  utility_lines: "hasUtilityLines",
};

for (const project of seedProjects) {
  test(`${project.id}: a generously-sized, obstacle-free space has no blocking flags`, () => {
    const result = checkFit(project, {
      ...baseInput,
      length_ft: project.footprint.length_ft + 10,
      width_ft: project.footprint.width_ft + 10,
      clearance_ft: project.clearance_ft + 10,
    });
    assert.equal(result.hasBlockingFlags, false);
    assert.equal(result.flags.some((f) => f.rule === "fits_in_space" || f.rule === "has_clearance"), false);
  });

  test(`${project.id}: a tiny space (0.1 ft) blocks on both footprint and clearance`, () => {
    const result = checkFit(project, { ...baseInput, length_ft: 0.1, width_ft: 0.1, clearance_ft: 0.1 });
    assert.equal(result.hasBlockingFlags, true);
    const rules = result.flags.map((f) => f.rule);
    assert.ok(rules.includes("fits_in_space"));
    assert.ok(rules.includes("has_clearance"));
  });

  test(`${project.id}: a zero-sized space blocks the same way a tiny one does`, () => {
    const result = checkFit(project, { ...baseInput, length_ft: 0, width_ft: 0, clearance_ft: 0 });
    assert.equal(result.hasBlockingFlags, true);
    const rules = result.flags.map((f) => f.rule);
    assert.ok(rules.includes("fits_in_space"));
    assert.ok(rules.includes("has_clearance"));
  });

  test(`${project.id}: a very large space (999 ft) fits without throwing`, () => {
    const result = checkFit(project, { ...baseInput, length_ft: 999, width_ft: 999, clearance_ft: 999 });
    assert.equal(result.hasBlockingFlags, false);
  });

  test(`${project.id}: missing (null/undefined) dimensions never throw, and never count as fitting`, () => {
    const result = checkFit(project, { ...baseInput, length_ft: null, width_ft: undefined, clearance_ft: null });
    assert.equal(result.hasBlockingFlags, true);
  });

  test(`${project.id}: every obstacle the project actually lists as relevant flags when reported, with a next step`, () => {
    const relevant = project.obstacles_relevant ?? [];
    const allObstaclesInput = {
      sloped: true,
      attachedToStructure: false,
      hasTree: true,
      hasFenceLine: true,
      hasUtilityLines: true,
    };
    const result = checkFit(project, {
      ...baseInput,
      length_ft: project.footprint.length_ft + 10,
      width_ft: project.footprint.width_ft + 10,
      clearance_ft: project.clearance_ft + 10,
      ...allObstaclesInput,
    });

    const obstacleFlags = result.flags.filter((f) => f.rule === "obstacle_conflict");
    assert.equal(obstacleFlags.length, relevant.length, `expected one flag per relevant obstacle (${relevant.join(", ") || "none"})`);

    for (const obstacle of relevant) {
      const flag = obstacleFlags.find((f) => f.text.includes(obstacle === "utility_lines" ? "utility lines" : obstacle === "fence_line" ? "fence line" : obstacle));
      assert.ok(flag, `expected a flag for obstacle "${obstacle}"`);
      assert.equal(flag.severity, obstacle === "utility_lines" ? "advisory-strong" : "advisory");
      assert.equal(typeof flag.nextStep, "string");
      assert.ok(flag.nextStep.trim().length > 0, `obstacle "${obstacle}" flag has no next step`);
    }

    // sloped and tree-covered yards specifically, called out by name in the Trello card.
    if (relevant.includes("slope")) {
      assert.ok(obstacleFlags.some((f) => f.text.includes("slope")));
    }
    if (relevant.includes("tree")) {
      assert.ok(obstacleFlags.some((f) => f.text.includes("tree")));
    }
  });

  test(`${project.id}: obstacles not relevant to this project never flag, even if reported`, () => {
    const relevant = new Set(project.obstacles_relevant ?? []);
    const irrelevant = Object.keys(OBSTACLE_INPUT_FIELD).filter((obstacle) => !relevant.has(obstacle));
    if (irrelevant.length === 0) return; // every obstacle type applies to this project; nothing to check

    const input = { ...baseInput, length_ft: project.footprint.length_ft + 10, width_ft: project.footprint.width_ft + 10, clearance_ft: project.clearance_ft + 10 };
    for (const obstacle of irrelevant) {
      input[OBSTACLE_INPUT_FIELD[obstacle]] = true;
    }
    const result = checkFit(project, input);
    assert.equal(result.flags.filter((f) => f.rule === "obstacle_conflict").length, 0);
  });

  test(`${project.id}: every flag that fires carries plain-language text and a concrete next step`, () => {
    // Trip every rule at once (tiny space + attached-to-structure + every obstacle)
    // so whatever this project is capable of flagging, it flags here.
    const result = checkFit(
      { ...project, engineer_review_required: true },
      { ...baseInput, length_ft: 0.1, width_ft: 0.1, clearance_ft: 0.1, attachedToStructure: true, sloped: true, hasTree: true, hasFenceLine: true, hasUtilityLines: true }
    );
    assert.ok(result.flags.length > 0);
    for (const flag of result.flags) {
      assert.equal(typeof flag.text, "string");
      assert.ok(flag.text.trim().length > 0, `${flag.rule} has empty text`);
      assert.equal(typeof flag.nextStep, "string", `${flag.rule} is missing a nextStep`);
      assert.ok(flag.nextStep.trim().length > 0, `${flag.rule} has an empty nextStep`);
    }
  });
}
