# Space Measurement

Owner: Anish Jaiswal

Scope notes for the **Space Input & Complication Flagging** feature (see README Core Features). This covers the three Sprint 0 scoping items on the "Design dimension-fit rules engine" Trello card: input fields/units, slope & setback research, and the manual measurement input flow.

## Goal

Check a chosen project design against the user's real yard/room dimensions and flag issues before they commit to a build.

## 1. Input Fields & Units

**Fields (MVP — manual entry):**
- Length, width, height/clearance (numeric, decimal allowed)
- Surface type (flat, sloped, grass, concrete, deck, etc.)
- Known obstructions (fence lines, trees, utility access, doorways)

**Units decision:** Default to **feet + inches (decimal feet, e.g. 12.5 ft)** as the primary unit, since our target users (US-based DIY parents) think in imperial for home projects. Provide a **metric toggle (meters)** for accessibility, converting internally rather than maintaining two parallel data paths. Store all values internally in a single base unit (centimeters) to avoid conversion drift, and format for display based on user preference.

## 2. Slope, Grading & Setback Research

- **Slope:** Most DIY structure guides (playhouses, sheds, decks) treat **grade under 2%** as "flat enough" for a standard build, **2-5%** as needing minor leveling (footings/piers), and **over 5% (roughly a 3° incline)** as requiring engineered leveling or a different foundation approach. HandyDad should flag anything the user reports as "sloped" for a manual review note rather than attempting a precise grade calculation from manual input alone.
- **Setbacks (property line distance):** Setback requirements are set by **local zoning, not a national standard** — typical residential accessory-structure setbacks range **5-15 ft from side/rear property lines**, but this varies significantly by city/county. HandyDad's MVP should **not claim to know the user's local setback rule**; instead it should prompt the user to confirm their local setback distance (with a plain-language explanation of what a setback is) and flag if their entered dimensions would place a structure closer than that confirmed distance to a property line.
- **Load-bearing:** For builds attached to an existing structure (deck, wall, roof), flag for manual verification rather than attempting a load calculation — this is a safety-relevant judgment call, not something to automate for MVP.

## 3. Manual Measurement Input Flow (MVP)

Step-by-step, for the initial manual-entry flow:

1. User selects a project from the library.
2. User is shown the project's required footprint (length x width, and height/clearance if relevant).
3. User enters their available space dimensions, choosing units (ft/in default, meters optional).
4. User answers a short set of yes/no + free-text prompts: "Is the ground sloped?", "Any known obstructions (trees, fences, utilities)?", "Is this attached to an existing structure?"
5. System runs the fit/clearance check against the project's footprint.
6. System returns one of: **Fits cleanly**, **Fits with flagged complications** (slope/setback/load-bearing notes shown in plain language), or **Doesn't fit** (with the specific dimension that fails).
7. User can adjust entered dimensions and re-check, or proceed to the budget-tier materials step.

## Output

- Pass/fail-style fit result per project
- List of specific complications with plain-language explanations (not just "fails")

## Stretch (Capstone II)

- AR-based measurement (ARKit/ARCore or WebXR) to replace manual entry — see the "Resolve open question: how far to take AR measurement" Trello card for the feasibility writeup and recommendation to cut this from MVP.

## Open questions

- Data model for dimension-fit rules — shared with Budget & Materials Engine or standalone?
- How complications surface in the UI (blocking vs. advisory)?
