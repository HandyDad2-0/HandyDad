import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkFit } from "../src/lib/dimensionFit.js";

const seedProjects = JSON.parse(fs.readFileSync(new URL("../../data/seed-projects.json", import.meta.url)));
const getProject = (id) => seedProjects.find((p) => p.id === id);

const sandbox = getProject("kid-backyard-sandbox"); // 4x4 ft, 3 ft clearance
const swingSet = getProject("kid-a-frame-swing-set"); // 8x10 ft, 6 ft clearance
const gardenBed = getProject("chore-raised-garden-bed"); // 4x8 ft, 2 ft clearance, obstacles: slope, utility_lines

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

test("sandbox: no flags and no blocking issues when space exceeds requirements", () => {
  const result = checkFit(sandbox, { ...baseInput, length_ft: 5, width_ft: 5, clearance_ft: 4 });
  assert.deepEqual(result.flags, []);
  assert.equal(result.hasBlockingFlags, false);
});

test("sandbox: footprint failure is blocking but doesn't stop clearance or other checks from also running", () => {
  const result = checkFit(sandbox, { ...baseInput, length_ft: 3, width_ft: 3, clearance_ft: 1 });
  assert.equal(result.hasBlockingFlags, true);
  const rules = result.flags.map((f) => f.rule);
  assert.ok(rules.includes("fits_in_space"));
  assert.ok(rules.includes("has_clearance"));
  assert.match(result.flags.find((f) => f.rule === "fits_in_space").text, /your space is 3 x 3 ft/);
});

test("swing set: clearance failure alone is blocking but still returns a result (never stops the flow)", () => {
  const result = checkFit(swingSet, { ...baseInput, length_ft: 8, width_ft: 10, clearance_ft: 5 });
  assert.equal(result.hasBlockingFlags, true);
  assert.equal(result.flags.length, 1);
  assert.equal(result.flags[0].rule, "has_clearance");
  assert.equal(result.flags[0].severity, "blocking");
});

test("swing set: slope and attached-to-structure raise non-blocking advisories", () => {
  const result = checkFit(swingSet, {
    ...baseInput,
    length_ft: 8,
    width_ft: 10,
    clearance_ft: 6,
    sloped: true,
    attachedToStructure: true,
  });
  assert.equal(result.hasBlockingFlags, false);
  const rules = result.flags.map((f) => f.rule);
  assert.ok(rules.includes("attached_to_structure"));
  assert.equal(result.flags.every((f) => f.severity === "advisory"), true);
});

test("garden bed: relevant obstacles (slope, utility_lines) flag; utility lines is advisory-strong", () => {
  const result = checkFit(gardenBed, {
    ...baseInput,
    length_ft: 4,
    width_ft: 8,
    clearance_ft: 2,
    sloped: true,
    hasUtilityLines: true,
  });
  assert.equal(result.flags.length, 2);
  const utilityFlag = result.flags.find((f) => /utility lines/.test(f.text));
  assert.equal(utilityFlag.severity, "advisory-strong");
  const slopeFlag = result.flags.find((f) => /slope/.test(f.text));
  assert.equal(slopeFlag.severity, "advisory");
});

test("garden bed: obstacles not in the project's obstacles_relevant list don't flag, even if checked", () => {
  // gardenBed's obstacles_relevant is ["slope", "utility_lines"] — no "tree" or "fence_line".
  const result = checkFit(gardenBed, {
    ...baseInput,
    length_ft: 4,
    width_ft: 8,
    clearance_ft: 2,
    hasTree: true,
    hasFenceLine: true,
  });
  assert.deepEqual(result.flags, []);
});

test("engineer_review_required and a height over threshold both trigger Rule 3, independently", () => {
  const reviewRequired = { ...sandbox, engineer_review_required: true };
  const r1 = checkFit(reviewRequired, { ...baseInput, length_ft: 5, width_ft: 5, clearance_ft: 4 });
  assert.equal(r1.flags.some((f) => f.rule === "engineer_review"), true);

  const heightThreshold = { ...sandbox, max_unassisted_height_ft: 6 };
  const underThreshold = checkFit(heightThreshold, { ...baseInput, length_ft: 5, width_ft: 5, clearance_ft: 4, entered_height_ft: 5 });
  assert.equal(underThreshold.flags.some((f) => f.rule === "engineer_review"), false);

  const overThreshold = checkFit(heightThreshold, { ...baseInput, length_ft: 5, width_ft: 5, clearance_ft: 4, entered_height_ft: 7 });
  assert.equal(overThreshold.flags.some((f) => f.rule === "engineer_review"), true);
});
