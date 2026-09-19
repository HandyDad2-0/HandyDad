# Budget & Materials Engine

Owner: Razee Nepal

Scope notes for the **Budget-Tier Materials Logic** feature (see README Core Features). This covers the Sprint 0 card "Build budget-tier materials logic (pine/cedar/composite tiers)."

## Goal

Given a project the user has selected (and confirmed fits their space via the Space Measurement flow), compute a cost estimate and material list at each of three budget tiers — **Pine**, **Cedar**, **Composite** — so the user can compare price vs. durability before committing to a build.

## 1. Relationship to Project Library & Space Measurement

This does **not** stand alone. It reads from the same project record that the Project Library (seed projects) and the dimension-fit rules engine (`docs/space-measurement.md`) already use, and it runs as **step 7** of that flow: *"proceed to the budget-tier materials step."*

This resolves that doc's open question — **the data model is shared, not standalone.** Every project in the library needs one new field: a **Bill of Materials (BOM)**.

## 2. Data Model — Bill of Materials (BOM)

Each project entry in the library gets a `materials` array. Each line item is:

```json
{
  "id": "framing-2x4",
  "category": "framing",
  "unit": "linear_ft",
  "quantity": 48,
  "tiered": true
}
```

```json
{
  "id": "deck-screws-3in",
  "category": "fasteners",
  "unit": "box_100",
  "quantity": 1,
  "tiered": false
}
```

- **`category`**: `framing`, `decking`, `fasteners`, `hardware`, `finish`
- **`tiered`**: whether this item's material (and price) changes by tier. Only `framing` and `decking` (and optionally `finish`) are tiered — pine/cedar/composite are wood/wood-alternative choices, so they don't apply to screws, brackets, hinges, etc.
- **`quantity`** is per the project's *base* footprint from the seed library (e.g. an 8x8 playhouse). It is **not** rescaled by the user's actual measured dimensions in MVP — that's a Capstone II refinement noted below.

## 3. Tier Price Catalog

A separate lookup table, independent of any single project, keyed by `category` + `tier`:

| Category | Pine ($/unit) | Cedar ($/unit) | Composite ($/unit) |
|---|---|---|---|
| framing (linear_ft) | 0.65 | 1.85 | 2.10 |
| decking (linear_ft) | 1.10 | 3.25 | 4.50 |

Non-tiered categories (fasteners, hardware, finish) use a single flat price regardless of tier. This table lives separately from project data so prices can be updated without touching every project record.

## 4. Computation Flow

1. User has a selected project (with its `materials` BOM) that has passed the space-measurement fit check.
2. For each tier (Pine, Cedar, Composite):
   - For each BOM line item: if `tiered`, look up unit price for (`category`, tier); if not, use flat price.
   - `line_cost = quantity * unit_price`
   - Sum all line costs → `tier_total`
3. Return all three tier totals plus the itemized list per tier, so the UI can show a side-by-side comparison (mirroring the "Fits / Fits with complications" plain-language pattern from Space Measurement).

## Output

- Three tier totals: Pine, Cedar, Composite
- Itemized material list per tier (name, quantity, unit price, line cost)
- No safety/complication flags here — those stay owned by the dimension-fit rules engine; this module is cost only

## Open questions

- Does base BOM quantity need to scale with the user's actual measured dimensions (vs. library's default footprint), or is fixed-per-project sufficient for MVP? Proposing: fixed for MVP, scaling is a Capstone II item.
- Where does the price catalog live long-term — hardcoded constants, JSON config, or admin-editable? Proposing: JSON config file for now, easy to swap for a DB table later.
- Regional price variation (materials cost differs by location) — out of scope for MVP, flagged for later.
