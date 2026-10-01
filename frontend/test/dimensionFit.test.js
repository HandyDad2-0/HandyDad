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
  sloped: false,
  attachedToStructure: false,
  hasTree: false,
  hasFenceLine: false,
  hasUtilityLines: false,
};

test("sandbox: clean fit with no complications when space exceeds requirements", () => {
  const result = checkFit(sandbox, { ...baseInput, length_ft: 5, width_ft: 5, clearance_ft: 4 });
  assert.equal(result.fits, true);
  assert.deepEqual(result.complications, []);
});

test("sandbox: fails on footprint before clearance is even checked", () => {
  const result = checkFit(sandbox, { ...baseInput, length_ft: 3, width_ft: 3, clearance_ft: 10 });
  assert.equal(result.fits, false);
  assert.match(result.complications[0], /smaller than this project's 4×4 ft footprint/);
});

test("swing set: fails on clearance even though footprint fits", () => {
  const result = checkFit(swingSet, { ...baseInput, length_ft: 8, width_ft: 10, clearance_ft: 5 });
  assert.equal(result.fits, false);
  assert.match(result.complications[0], /needs 6 ft of clearance/);
});

test("swing set: slope and attached-to-structure both raise advisories without blocking the fit", () => {
  const result = checkFit(swingSet, {
    ...baseInput,
    length_ft: 8,
    width_ft: 10,
    clearance_ft: 6,
    sloped: true,
    attachedToStructure: true,
  });
  assert.equal(result.fits, true);
  assert.equal(result.complications.length, 2);
  assert.match(result.complications[0], /sloped ground/i);
  assert.match(result.complications[1], /attaches to an existing structure/i);
});

test("garden bed: fence-line and utility-line advisories fire from user input", () => {
  const result = checkFit(gardenBed, {
    ...baseInput,
    length_ft: 4,
    width_ft: 8,
    clearance_ft: 2,
    hasFenceLine: true,
    hasUtilityLines: true,
  });
  assert.equal(result.fits, true);
  assert.equal(result.complications.length, 2);
  assert.match(result.complications[0], /fence line/i);
  assert.match(result.complications[1], /utility lines/i);
});

test("tree advisory only fires when the project lists tree as a relevant obstacle", () => {
  const projectWithTree = { ...gardenBed, obstacles_relevant: ["tree"] };
  const withTree = checkFit(projectWithTree, { ...baseInput, length_ft: 4, width_ft: 8, clearance_ft: 2, hasTree: true });
  assert.equal(withTree.complications.some((c) => /tree/i.test(c)), true);

  // gardenBed's real obstacles_relevant is ["slope", "utility_lines"] — no "tree" — so the
  // same user input should NOT raise a tree advisory against the actual seed data.
  const withoutTreeRelevance = checkFit(gardenBed, { ...baseInput, length_ft: 4, width_ft: 8, clearance_ft: 2, hasTree: true });
  assert.equal(withoutTreeRelevance.complications.some((c) => /tree/i.test(c)), false);
});

test("engineer_review_required and max_unassisted_height_ft surface as advisories when set on the project", () => {
  const flaggedProject = { ...sandbox, engineer_review_required: true, max_unassisted_height_ft: 7 };
  const result = checkFit(flaggedProject, { ...baseInput, length_ft: 5, width_ft: 5, clearance_ft: 4 });
  assert.equal(result.fits, true);
  assert.equal(result.complications.some((c) => /reviewed for load-bearing safety/i.test(c)), true);
  assert.equal(result.complications.some((c) => /reaches 7 ft unassisted/i.test(c)), true);
});
