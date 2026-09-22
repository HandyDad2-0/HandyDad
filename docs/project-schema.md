# Project Data Schema

Owner: Razee Nepal

## Why this doc exists

Three systems each need structured, per-project data:

- **Dimension-fit rules engine** (Anish, `docs/space-measurement.md`) — needs numeric footprint and clearance to compare against what the user enters.
- **Safety/complication flagging rules** (Austin, `docs/basic-safety-complication-flagging-rules.md`) — needs the same footprint/clearance fields, plus an obstacle list and an engineer-review flag.
- **Budget & Materials Engine** (Razee, `docs/budget-materials.md`) — needs an itemized Bill of Materials (BOM) per project.

The actual seed project content (`docs/initial-project-library-seed-projects.md`) has none of this in machine-readable form — footprint and clearance are one free-text cell ("4x4 ft, 3 ft clearance"), and cost is a hand-estimated $ range per tier rather than a computed one. All three engines were designed against a project record that doesn't exist yet in the content.

This doc proposes one canonical `Project` schema that all three engines read from, so nobody builds against a different shape of the same data.

## Proposed Schema

```json
{
  "id": "kid-backyard-sandbox",
  "name": "Backyard Sandbox",
  "category": "kid_structure",
  "skill_level": "beginner",
  "build_time_hours": { "min": 2, "max": 3 },

  "footprint": { "length_ft": 4, "width_ft": 4 },
  "clearance_ft": 3,

  "engineer_review_required": false,
  "max_unassisted_height_ft": null,

  "obstacles_relevant": ["slope", "tree"],

  "materials": [
    { "id": "framing-2x4", "category": "framing", "unit": "linear_ft", "quantity": 16, "tiered": true },
    { "id": "deck-screws-2in", "category": "fasteners", "unit": "box_100", "quantity": 1, "tiered": false }
  ],

  "description": "A framed, in-ground sandbox with a bench-style lid to keep debris and pets out overnight."
}
```

Field-by-field, and which system owns/reads it:

| Field | Type | Owner (fills it in) | Read by |
|---|---|---|---|
| `footprint.length_ft` / `width_ft` | number | content (Austin) | Anish's fit check, Austin's Rule 1 |
| `clearance_ft` | number | content (Austin) | Anish's fit check, Austin's Rule 2 |
| `engineer_review_required` | boolean | content (Austin) | Austin's Rule 3 |
| `max_unassisted_height_ft` | number \| null | content (Austin), only where relevant | Austin's Rule 3 |
| `obstacles_relevant` | array of `slope`\|`tree`\|`fence_line`\|`utility_lines` | content (Austin) | Austin's Rule 4 |
| `materials` | array (BOM, see `docs/budget-materials.md`) | Razee | Razee's tier-pricing engine |
| `skill_level`, `build_time_hours`, `category`, `description` | as today | content (Austin) | Project Library browse/filter (S-01), Project Detail (S-04) |

`materials` is the only field this doc adds ownership of for Razee specifically — everything else in the footprint/clearance/obstacle group is content Austin already half-has (as prose) and just needs reshaped into numbers.

## What happens to Austin's hand-estimated budget ranges?

Right now each seed project has its own $ range per tier (e.g. Sandbox: $40–60 / $70–90 / $120–150). Once a project has a `materials` array, the tier-pricing engine computes that number instead — so the hand-estimated range becomes redundant with, and could drift from, the computed one.

Proposal: keep the hand-estimated range temporarily as a `budget_estimate_reference` field (clearly labeled as a rough sanity check, not the number the UI shows), and drop it once every seed project has a real `materials` array and the computed numbers are validated against it.

## Applying this to the current 8 seed projects

Footprint and clearance convert directly from Austin's existing text (no new research needed, just reshaping):

| Project | length_ft | width_ft | clearance_ft |
|---|---|---|---|
| Backyard Sandbox | 4 | 4 | 3 |
| Kids' Picnic Table | 5 | 3 | 3 |
| A-Frame Swing Set | 8 | 10 | 6 |
| Simple Playhouse | 6 | 6 | 4 |
| Raised Garden Bed | 4 | 8 | 2 |
| Firewood Storage Rack | 6 | 2 | 2 |
| Compost Bin (3-bay) | 6 | 3 | 3 |
| Trash & Recycling Bin Corral | 4 | 3 | 3 |

`engineer_review_required`: none of the 8 seed projects involve an elevated deck, retaining wall, or structural tie-in, so all 8 are `false` in this first pass — worth Austin confirming since he owns project content.

`obstacles_relevant` and `materials`: these need a content decision per project (which obstacles genuinely apply, what's actually in each build) rather than a guess from the schema doc — flagged as open questions below, not filled in here for all 8.

## Open questions

- Who actually reshapes the 8 seed projects into this schema — Austin (owns the content) or whoever needs it first? Proposing Austin, since `engineer_review_required` and `obstacles_relevant` require judgment calls about the actual builds that only the content owner can make confidently.
- Does `materials` get authored by hand per project, or does someone build a rough BOM-estimation helper (e.g. from footprint + category) to bootstrap all 8 at once and then hand-correct? Given only 8 projects, hand-authoring is probably faster than building a helper for this pass.
- Same open question `docs/budget-materials.md` already flags: does BOM quantity scale with a user's actual measured dimensions, or stay fixed to the seed library's footprint? This schema doesn't resolve that either — still proposing fixed-for-MVP.
- Format: is JSON (as shown here) the right format long-term, or should this become a database table once a backend exists? No backend yet, so JSON files under a `data/` folder are proposed as the interim format.
