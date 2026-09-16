# Space Measurement

Owner: Anish Jaiswal

Scope notes for the **Space Input & Complication Flagging** feature (see README Core Features).

## Goal

Check a chosen project design against the user's real yard/room dimensions and flag issues before they commit to a build.

## Inputs (MVP — manual entry)

- Available space dimensions (length, width, height/clearance where relevant)
- Surface type (flat, sloped, grass, concrete, deck, etc.)
- Known obstructions (fence lines, trees, utility access, doorways)

## Checks

- **Fit** — does the project's footprint fit within the entered dimensions?
- **Clearance** — is there enough surrounding space for safe access/use (e.g. swing radius, walkway width)?
- **Slope/grading** — flag projects that assume flat ground if the user reports a slope
- **Load-bearing** — basic flags for builds attached to structures (deck, wall, roof) that may need support verification

## Output

- Pass/fail-style fit result per project
- List of specific complications with plain-language explanations (not just "fails")

## Stretch (Capstone II)

- AR-based measurement (ARKit/ARCore or WebXR) to replace manual entry

## Open questions

- Data model for dimension-fit rules — shared with Budget & Materials Engine or standalone?
- How complications surface in the UI (blocking vs. advisory)?
