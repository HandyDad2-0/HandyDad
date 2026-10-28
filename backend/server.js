/**
 * HandyDad backend — Monthly Build Challenge API, Q&A contract stub, and
 * the Dimension-Fit rules engine endpoint.
 * Challenge owner: Razee Nepal; Q&A owner: Nicholas Marshall;
 * Dimension-fit owner: Anish Jaiswal.
 *
 * Endpoints:
 *   GET  /api/challenge                     -> { monthLabel, votingClosesLabel, votingClosesAt, submissions }
 *   POST /api/challenge/submissions         body: { title, builderName }
 *   POST /api/challenge/submissions/:id/vote body: { voterId }
 *   GET  /api/challenge/archive             -> past months + winners
 *   POST /api/qa/questions                    body: { projectId, question } (stub)
 *   POST /api/dimension-fit                   body: { projectId, length_ft, width_ft, clearance_ft, entered_height_ft?, obstacles? }
 *
 * See docs/monthly-build-challenge-backend.md for the design doc and how
 * this is meant to replace the frontend's mock data
 * (frontend/src/data/challengeSubmissions.js, frontend/src/lib/challenge.js).
 * See dimension-fit-engine.js and lib/dimensionFitHandler.js for the rules
 * engine and its input validation.
 */

import express from "express";
import { getChallenge, addSubmission, castVote, getArchive } from "./lib/challengeStore.js";
import { handleQuestion } from "./lib/qa.js";
import { handleDimensionFit } from "./lib/dimensionFitHandler.js";

const app = express();
app.use(express.json());

app.post("/api/qa/questions", handleQuestion);
app.post("/api/dimension-fit", handleDimensionFit);

app.get("/api/challenge", (req, res) => {
  res.json(getChallenge());
});

app.post("/api/challenge/submissions", (req, res) => {
  const { title, builderName } = req.body ?? {};
  if (!title?.trim() || !builderName?.trim()) {
    return res.status(400).json({ error: "title and builderName are required" });
  }
  const { challenge, submission } = addSubmission({ title: title.trim(), builderName: builderName.trim() });
  res.status(201).json({ submission, challenge });
});

app.post("/api/challenge/submissions/:id/vote", (req, res) => {
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

const PORT = process.env.PORT || 3001;

// Only start listening when run directly (node server.js), not when
// imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`HandyDad backend listening on http://localhost:${PORT}`);
  });
}

export default app;
