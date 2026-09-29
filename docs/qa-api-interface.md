# Q&A API interface (Sprint 1)

Owner: Nicholas Marshall

The backend exposes `POST /api/qa/questions` so the app can agree on an interface before the grounded assistant is built in Capstone II. It does not call a model or return build advice.

Request (`Content-Type: application/json`):

```json
{ "projectId": "kid-backyard-sandbox", "question": "Which materials does this project require?" }
```

`projectId` must identify an existing project in `data/seed-projects.json`; both fields must be nonempty strings. The endpoint requires a selected project because the planned Q&A flow is project-specific.

For a valid request, the current stub returns HTTP 501:

```json
{
  "code": "QA_NOT_IMPLEMENTED",
  "message": "Build question answers are not available yet.",
  "projectId": "kid-backyard-sandbox",
  "answer": null,
  "sources": []
}
```

The frontend should show `message` as an unavailable state, never display `answer` as though it contains advice. Invalid or blank inputs return HTTP 400 (`INVALID_QUESTION`); unknown project IDs return HTTP 404 (`PROJECT_NOT_FOUND`). Future implementation can return HTTP 200 with `projectId`, a supported `answer`, and `sources` identifying the approved project data used. The success schema and citation granularity require team agreement before integration. See `docs/ai-grounding.md` for retrieval and safety requirements.

Run locally from `backend/` with `npm install && npm start`, then call the endpoint with the sample JSON above. Run `npm test` for the contract checks.

## “Describe Your Own Idea” overlap and ownership proposal

The idea screen accepts a free-text description and finds matching projects in the catalog. Q&A accepts a question **after a project is selected** and eventually grounds an answer in that project's approved data. The two flows both interpret free text and retrieve project data, but have different outputs and safety requirements. A search match percentage should not be presented as a verified build or safety answer.

Proposed split for team confirmation:

- Shaket (frontend and UX): idea input and results screens.
- Austin (project library and rules): catalog matching, match criteria, and a no-match result.
- Nicholas (Q&A): advise on reusable question normalization and project retrieval boundaries; own `POST /api/qa/questions`. Do not route idea search through this Q&A stub.
- Team: confirm who owns a separate idea-search API, how a custom-build entry point works, and whether the match percentage can be explained and tested. Monthly challenge submissions are a separate flow.

This is a proposal, not a decision or implemented idea-search feature.
