# HandyDad Frontend

React + Vite scaffold for the MVP core flow: browse the project library,
view a project's detail, enter space dimensions, and see complication
flags plus a budget-tiered materials list.

## Running it

```
npm install
npm run dev
```

The Monthly Challenge screen talks to the backend API. In a second
terminal, start it with `npm install && npm start` inside `backend/`
(port 3001); the Vite dev server proxies `/api` to it.

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
- **Monthly Challenge** (`src/screens/MonthlyChallenge.jsx`) loads, submits and votes through Razee's API. Votes use a random `voterId` kept in localStorage; the server enforces one vote per submission per `voterId` and answers 409 on a repeat, which the screen handles.
- **Navigation** (`src/App.jsx`) is simple React state, not a router.
  Fine for four screens; worth moving to a real router if more screens
  get added.

## Not yet wired up

- **Describe Your Idea** (`src/screens/DescribeIdea.jsx`, `src/lib/ideaMatchApi.js`)
  expects `POST /api/ideas/match` from Nicholas's backend. The response shape
  it codes against (`{ matches: [{ projectId, matchPercent, reason }], noMatch }`)
  was proposed to him and is **not confirmed**; all shape-dependent code is in
  `ideaMatchApi.js`. Until the endpoint exists the screen shows an
  "unavailable" notice. The custom-build path only explains that custom builds
  can't be saved yet, because what it saves hasn't been decided.
- **Ask HandyDad** (`src/components/AskHandyDad.jsx`, `src/lib/qaApi.js`) calls
  `POST /api/qa/questions`. The backend is still the 501 stub, so the panel
  shows its message as "Not available yet" and never presents an answer unless
  the server returns a real one. The 200 success schema still needs team
  agreement (see `docs/qa-api-interface.md`).
- Only the Monthly Challenge goes through the API (`src/lib/challengeApi.js`,
  using the `/api/challenge` endpoints). Project data and materials pricing
  are still imported directly from the filesystem at build time. See
  Trello: "Backend/API integration layer" for when that changes.
