// Content-level safety checks on data/seed-projects.json that the generic
// schema test can't express. Each one comes from the "Safety and
// Complication Considerations" section of
// docs/Seed Project Library Expansion.docx, so a later BOM edit or
// materials substitution can't quietly drop them.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projects = JSON.parse(readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8"));
const byId = new Map(projects.map((p) => [p.id, p]));

function get(id) {
  const project = byId.get(id);
  assert.ok(project, `expected seed project "${id}" to exist`);
  return project;
}
const materialIds = (project) => project.materials.map((line) => line.id);

test("Outdoor Toy Storage Box never ships with a latch (CPSC toy chest guidance)", () => {
  const ids = materialIds(get("chore-toy-storage-box"));
  assert.ok(!ids.some((id) => /latch|lock/.test(id)), `toy box BOM must not include a latch or lock: ${ids.join(", ")}`);
});

for (const id of ["chore-toy-storage-box", "chore-tool-storage-bench"]) {
  test(`${id}: BOM includes lid-stay / lid-support hardware so the lid can't slam shut`, () => {
    const ids = materialIds(get(id));
    assert.ok(ids.some((m) => /lid-(stay|support)/.test(m)), `missing lid-stay or lid-support hardware: ${ids.join(", ")}`);
  });
}

// Projects that involve digging (in-ground frame, ground anchors, buried
// footing) must surface the utility-lines flag, which the dimension-fit
// engine shows with the stronger "call 811" treatment.
for (const id of ["kid-backyard-sandbox", "kid-a-frame-swing-set", "chore-raised-garden-bed", "chore-hose-holder-post"]) {
  test(`${id}: involves digging, so utility_lines is a relevant obstacle`, () => {
    assert.ok(get(id).obstacles_relevant.includes("utility_lines"));
  });
}
