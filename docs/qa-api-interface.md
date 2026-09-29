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

## “Describe Your Own Idea” overlap and ownership

Nicholas Marshall is the confirmed owner of the proposed Sprint 1 “Describe Your Own Idea” feature. The feature is not in the submitted Requirements document. A user enters a free-text project description and sees similar existing projects with a match percentage, or a path to create a fully custom project if no match fits. The Idea Results artboard is linked from the sprint card.

This overlaps with Q&A because both interpret free text and retrieve project data. Their outputs differ: idea search matches a description to catalog entries; Q&A accepts a question **after a project is selected** and eventually grounds an answer in approved data for that project. A match percentage is a discovery score, not a verified build or safety answer. Do not route idea search through the Q&A stub.

Coordination needed before implementation:

- Nicholas owns the feature and should coordinate project data access with Austin, who owns the Project Library data.
- Align the input and results screens with Shaket's frontend work and the approved wireframe.
- Define how matches and percentages are calculated and what happens when there is no suitable match.
- Define where the fully custom project path goes and what data it saves. It should not silently create a Monthly Build Challenge submission.

The feature is not implemented by the Q&A API stub in this change.
