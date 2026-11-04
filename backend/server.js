import express from "express";
import { getChallenge, addSubmission, castVote, getArchive } from "./lib/challengeStore.js";
import { handleQuestion } from "./lib/qa.js";
import { handleProjectMatch } from "./lib/projectMatch.js";
import { handleDimensionFit } from "./lib/dimensionFitHandler.js";
import { createRateLimiter } from "./lib/rateLimit.js";
import { handleListProjects, handleGetProject, handleGetProjectMaterials } from "./lib/projectsHandlers.js";

const app = express();
app.use(express.json({ limit: "10kb" }));

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
app.post("/api/ideas/match", handleProjectMatch);
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
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`HandyDad backend listening on http://localhost:${PORT}`);
  });
}

export default app;
