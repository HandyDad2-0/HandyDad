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
| framing (linear_ft) | 0.48 | 2.96 | 0.48 *(same as pine, see below)* |
| decking (linear_ft) | 0.95 | 3.89 | 2.34 |

Non-tiered categories (fasteners, hardware, finish) use a single flat price regardless of tier. This table lives separately from project data so prices can be updated without touching every project record.

**Sources (updated Nov 17, 2026).** Every price below is from Home Depot. The Nov 17 prices were read off the product listings at the North Denton, TX store (ZIP 76201); the Sep prices were taken the same way earlier in the project. Per-foot prices are the listed price divided by the board length.

| Catalog entry | Product | Model | Listed price | Per linear ft | Date |
|---|---|---|---|---|---|
| framing.pine | 2 in. x 4 in. x 92-5/8 in. Prime Whitewood Stud | 769887148204 | $3.72 (7.72 ft) | $0.48 | Nov 17, 2026 |
| framing.cedar | 2 in. x 4 in. x 8 ft. Rough Green Western Red Cedar Lumber | 702145 | $23.98 | $3.00 | Nov 17, 2026 |
| framing.cedar | 2 in. x 4 in. x 12 ft. Rough Green Western Red Cedar Lumber | 545212 | $34.98 | $2.92 | Nov 17, 2026 |
| framing.cedar (used) | average of the two cedar lengths above | | | **$2.96** | Nov 17, 2026 |
| framing.composite | same as framing.pine (see decision below) | | | $0.48 | Nov 17, 2026 |
| decking.pine | WeatherShield 5/4 in. x 6 in. x 16 ft. Pressure-Treated Southern Yellow Pine Decking | | $15.18 | $0.95 | Sep 19, 2026 |
| decking.cedar | 1 in. x 6 in. x 8 ft. S1S2E Cedar Board 5-Pack | WRC168T5PK | $155.40 / 5 boards ($31.08 each) | $3.89 | Sep 26, 2026 |
| decking.composite | Trex Enhance Naturals 1 in. x 6 in. x 16 ft. Rocky Harbor Grooved Edge Composite Deck Board | RH010616E2G01 | $37.42 | $2.34 | Nov 17, 2026 |

Other composite boards seen on Nov 17, for reference: Trex Enhance Naturals 1x6x12 grooved (RH010612E2G01) $27.88 = $2.32/ft; Trex Enhance Naturals 1x6x8 square edge (RH010608E2S01) $18.61 = $2.33/ft; Veranda 1x6x16 capped composite (BRDVCDG G 16) $27.98 = $1.75/ft. The Trex Enhance Naturals 16 ft board is used for the catalog because it is a mainstream Trex product and its per-foot price matches the other Trex lengths. The Veranda board is cheaper per foot; the catalog uses the Trex price because it is the more widely known composite brand.

Notes on how the numbers were chosen:

- **Cedar framing is Rough Green (rough-sawn) cedar,** the kind sold as framing stock. The 2x4x8 and 2x4x12 prices differ per foot, so the catalog uses their average. The "4-pack" cedar fence-panel backer rails on the same page were not used because they are fence parts, not framing.
- **Pine framing changed from $0.50 to $0.48/ft** because the product on the shelf changed (a 92-5/8 in. precut stud instead of a 96 in. stud, and a lower price). Buying 50 or more drops it to $3.35.
- **Cedar decking ($3.89) is the oldest price here (Sep 26).** It was not rechecked on Nov 17. Recheck it before any final numbers are presented.
- **Composite decking was Trex Enhance Basics at $2.00/ft in September.** That product was not among the listings checked on Nov 17, so the catalog now uses Trex Enhance Naturals at $2.34/ft, which was.

**Decision: how the composite tier is built.** Composite framing lumber is not sold at retail. Composite and plastic lumber are decking products, so there is no real price to put on a "composite 2x4." The composite tier is therefore **pine framing under composite decking**, which is how composite decks are actually built. This closes the open flag from Sprint 1 about the composite framing estimate.

**Resulting tier order.** At retail, composite decking ($2.34/ft) costs less than cedar decking ($3.89/ft), and cedar framing ($2.96/ft) costs much more than pine framing ($0.48/ft). So for any project with decking, the tiers come out **pine < composite < cedar**. The earlier assumption that composite is the most expensive tier did not hold up against real prices: composite is the low-maintenance mid-priced option, and cedar is the premium material. Projects with no decking (the A-frame swing set, balance beam and raised garden bed) have identical pine and composite totals, because they have no decking to upgrade. `backend/test/tierOrdering.test.js` checks this order for every project, so a future price change cannot silently scramble it.

**Known simplifications.**

- Each BOM prices all framing (2x4, 2x6 and 4x4) at one per-foot rate, taken from the 2x4. A 4x4 or 2x6 costs more per foot than a 2x4, so framing is understated in every tier, and cedar is understated most in absolute dollars. This is unchanged from before and would need per-size prices to fix.
- Prices are for one store and one day. Regional and seasonal variation is out of scope for the MVP.
- The tier order in the UI is still Pine, Cedar, Composite. Cost order is now Pine, Composite, Cedar, so the left-to-right display does not run from cheapest to most expensive. Changing the display order is a frontend decision.

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
