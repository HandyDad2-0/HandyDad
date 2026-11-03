/**
 * HandyDad backend — Monthly Build Challenge API, Q&A contract stub, and
 * the Dimension-Fit rules engine endpoint.
 * Challenge owner: Razee Nepal; Q&A owner: Nicholas Marshall;
 * Dimension-fit owner: Anish Jaiswal.
 *
 * Endpoints:
 *   GET  /api/challenge                     -> { monthLabel, votingClosesLabel, votingClosesAt, submissions }
 *   POST /api/challenge/submissions         body: { title (<=100 chars), builderName (<=60 chars) }; 5 per hour per IP
 *   POST /api/challenge/submissions/:id/vote body: { voterId }; 30 per 10 minutes per IP
 *   GET  /api/challenge/archive             -> past months + winners
 *   POST /api/qa/questions                    body: { projectId, question } (stub)
 *   POST /api/dimension-fit                   body: { projectId, length_ft, width_ft, clearance_ft, entered_height_ft?, obstacles? }
 *   GET  /api/projects                        -> { projects }
 *   GET  /api/projects/:id                    -> project record (404 if unknown)
 *   GET  /api/projects/:id/materials          -> { projectId, source, tiers } (see lib/projectsHandlers.js)
 *
 * See docs/monthly-build-challenge-backend.md for the design doc and how
 * this is meant to replace the frontend's mock data
 * (frontend/src/data/challengeSubmissions.js, frontend/src/lib/challenge.js).
 * See dimension-fit-engine.js and lib/dimensionFitHandler.js for the rules
 * engine and its input validation, and docs/api-integration-layer.md for the
 * projects/materials endpoints.
 */

import express from "express";
import { getChallenge, addSubmission, castVote, getArchive } from "./lib/challengeStore.js";
import { handleQuestion } from "./lib/qa.js";
import { handleDimensionFit } from "./lib/dimensionFitHandler.js";
import { createRateLimiter } from "./lib/rateLimit.js";
import { handleListProjects, handleGetProject, handleGetProjectMaterials } from "./lib/projectsHandlers.js";

const app = express();
// Every JSON body this API accepts is tiny; cap it so a client can't make the
// server buffer huge payloads.
app.use(express.json({ limit: "10kb" }));

// Per-IP throttles for the two public write endpoints. A voterId only stops
// one browser from voting twice on a submission; these slow down anyone
// scripting new voterIds or flooding submissions. Limits are generous for a
// real person (voting on every submission in a month fits well inside them).
const voteLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "You're voting too quickly. Please wait a few minutes and try again.",
});
const submitLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  error: "You've submitted several builds recently. Please try again in a little while.",
  message: "You've submitted several builds recently. Please try again in a little while.",
});

app.post("/api/qa/questions", handleQuestion);
app.post("/api/dimension-fit", handleDimensionFit);
app.get("/api/projects", handleListProjects);
app.get("/api/projects/:id", handleGetProject);
app.get("/api/projects/:id/materials", handleGetProjectMaterials);

app.get("/api/challenge", (req, res) => {
  res.json(getChallenge());
});

app.post("/api/challenge/submissions", submitLimiter, (req, res) => {
  const { title, builderName } = req.body ?? {};
  const result = addSubmission({ title, builderName });
  if (!result.ok) {
    // `error` is shown to the user by the frontend, so it is the readable message.
    const status = result.reason === "submissions_full" ? 409 : 400;
    return res.status(status).json({ error: result.message, code: result.reason });
  }
  res.status(201).json({ submission: result.submission, challenge: result.challenge });
});

app.post("/api/challenge/submissions/:id/vote", voteLimiter, (req, res) => {
  const { voterId } = req.body ?? {};
  const result = castVote(req.params.id, voterId);

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : result.reason === "already_voted" ? 409 : 400;
    return res.status(status).json({ error: result.reason, submission: result.submission ?? null });
  }
  res.json({ submission: result.submission });
});

app.get("/api/challenge/archive", (req, res) => {
  res.json({ archive: getArchive() });
});

// Malformed or oversized JSON bodies get a JSON error instead of Express's
// default HTML error page.
app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_json", message: "Request body must be valid JSON." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "payload_too_large", message: "Request body is too large." });
  }
  next(err);
});

const PORT = process.env.PORT || 3001;

// Only start listening when run directly (node server.js), not when
// imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`HandyDad backend listening on http://localhost:${PORT}`);
  });
}

export default app;
