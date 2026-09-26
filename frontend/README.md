# HandyDad Frontend

React + Vite scaffold for the MVP core flow: browse the project library,
view a project's detail, enter space dimensions, and see complication
flags plus a budget-tiered materials list.

## Running it

```
npm install
npm run dev
```

## What's real vs. placeholder

- **Project data** (`src/data/projects.js`) reads directly from
  `../data/seed-projects.json` — Austin's actual seed content, shaped to
  Razee's schema (`docs/project-schema.md`). There's no duplicated or
  mocked project data.
- **Materials pricing** (`src/lib/materials.js`) calls Razee's real
  `backend/materials-engine.js` for any project with a full Bill of
  Materials. Most seed projects don't have one yet (see each project's
  `pending_fields` in the JSON), so those fall back to the hand-estimated
  `budget_estimate_reference` range instead of a computed total. That
  fallback should come out once every seed project has a real BOM.
- **Dimension-fit checking** (`src/lib/dimensionFit.js`) is a
  **temporary placeholder** implementing the algorithm already
  documented in `docs/space-measurement.md` (footprint/clearance check
  + slope/obstacle advisories). Anish owns the real dimension-fit rules
  engine (Trello: "Anish — Review Schema & Build Dimension-Fit Engine").
  When that lands, swap this module's internals for the real one — the
  `checkFit(project, input)` function signature is meant to stay stable
  so the screens don't need to change.
- **Navigation** (`src/App.jsx`) is simple React state, not a router.
  Fine for four screens; worth moving to a real router if more screens
  get added.

## Not yet wired up

- Free-text idea search and the Monthly Build Challenge (both approved
  Sprint 1 features, tracked separately on Trello) aren't in this
  scaffold — the library screen has a placeholder box noting this.
- No backend/API server exists yet — this app currently imports
  `backend/materials-engine.js` and the seed data file directly from
  the filesystem at build time. See Trello: "Backend/API integration
  layer" for when that changes to a real fetch/API call.
