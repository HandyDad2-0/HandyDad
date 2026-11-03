# Backend/API Integration Layer

Owner: Razee Nepal

Scope notes for the Sprint 2 card "Backend/API integration layer (serve projects, materials and fit results to the frontend)."

## Where things stood

Fit results and the challenge were already served by the backend (`POST /api/dimension-fit`, `/api/challenge/*`, and the frontend already calls both). Projects and materials were the exception: the frontend imports `data/seed-projects.json` and `backend/materials-engine.js` directly (`frontend/src/data/projects.js`, `frontend/src/lib/materials.js`, and the `fs.allow` workaround in `frontend/vite.config.js`). This card adds the missing endpoints so the backend serves all three.

## Endpoints

Base URL is the backend (`npm start` in `backend/`, port 3001; the Vite dev server proxies `/api` to it).

| Method | Path | Returns |
|---|---|---|
| GET | `/api/projects` | `{ projects }`: every project record in `data/seed-projects.json` |
| GET | `/api/projects/:id` | The project record, or `404 PROJECT_NOT_FOUND` |
| GET | `/api/projects/:id/materials` | `{ projectId, source, tiers }`, or `404 PROJECT_NOT_FOUND` / `500 MATERIALS_UNPRICEABLE` |
| POST | `/api/dimension-fit` | Already existed (Anish): `{ flags, hasBlockingFlags }` |

Project records are returned exactly as stored, including `budget_estimate_reference` (the project detail page still reads it) and the `pending_fields`/`_note` annotations.

### `/materials` response

`source` tells the frontend how to render, matching what `frontend/src/lib/materials.js` does today:

- `"computed"`: the project has a `materials` BOM. `tiers` is the engine's output, `{ pine, cedar, composite }`, each `{ tier, items, total }`.
- `"estimate"`: no BOM, but a `budget_estimate_reference`. Each tier is `{ tier, items: [], total: null, estimateRange: [min, max] }`.
- `"unavailable"`: neither. `tiers` is `null`.

All 8 current seed projects have a BOM, so they all come back `"computed"`. The other two cases cover projects Austin adds before their BOMs exist.

A BOM line the engine can't price (unknown category or unit) returns `500 MATERIALS_UNPRICEABLE` with the engine's message, since that is a data problem rather than a bad request.

## Data loading

Seed data is read once at server start (same as the dimension-fit handler). Editing `data/seed-projects.json` needs a backend restart to show up.

## Not done here

- **Switching the frontend screens over.** The screens still use the direct imports, and `ProjectLibrary`/`ProjectDetail` read projects synchronously, so moving them to these endpoints means adding loading and error states. That is a frontend change on Shaket's side and is better as its own PR than bundled into this one. Once it lands, the `fs.allow` workaround in `frontend/vite.config.js` and the direct engine import can be removed.
- **Filtering on the server.** The library filters (time, skill, category) still run client-side in `frontend/src/lib/libraryFilters.js`. With 8 to a few dozen projects there is no reason to move them.

## Tests

`backend/test/projectsApi.test.js` covers the list, single-project and materials endpoints, the 404 cases, that every seed project with a BOM prices cleanly through the endpoint, and the estimate, unavailable and unpriceable branches.
