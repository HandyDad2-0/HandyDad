import { useRef, useState } from "react";
import { getProjectById, CATEGORY_LABELS, SKILL_LABELS } from "../data/projects.js";
import { matchIdea, IdeaSearchUnavailable, MAX_DESCRIPTION_LENGTH } from "../lib/ideaMatchApi.js";

// Describe Your Idea (S-02): free-text description -> similar catalog
// projects with a match percentage, or a "custom build" path when nothing
// fits. Matching itself is the backend's job (POST /api/ideas/match).
export default function DescribeIdea({ onBack, onSelectProject }) {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error | unavailable
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState("");
  const textareaRef = useRef(null);
  const resultsRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = description.trim();
    if (!text) {
      setFieldError("Describe what you want to build before searching.");
      textareaRef.current?.focus();
      return;
    }
    setFieldError("");
    setStatus("loading");
    setResult(null);
    try {
      const found = await matchIdea(text, getProjectById);
      setResult(found);
      setStatus("done");
      // Results appear below the form; move focus there so keyboard and
      // screen-reader users land on them.
      setTimeout(() => resultsRef.current?.focus(), 0);
    } catch (err) {
      setMessage(err.message);
      setStatus(err instanceof IdeaSearchUnavailable ? "unavailable" : "error");
    }
  }

  const loading = status === "loading";

  return (
    <div className="main-content">
      <button type="button" className="back-link" onClick={onBack}>
        <span aria-hidden="true">&larr;</span> Back to Project Library
      </button>

      <div className="idea-layout">
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Describe Your Idea</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 20 }}>
          Tell us what you want to build. We'll look for similar projects in the library and show how closely
          each one matches. A match is a starting point for browsing, not a safety or build check.
        </p>

        <form className="form-card" onSubmit={handleSubmit} noValidate>
          <label htmlFor="idea-text">What do you want to build?</label>
          <textarea
            id="idea-text"
            ref={textareaRef}
            rows={4}
            maxLength={MAX_DESCRIPTION_LENGTH}
            required
            aria-required="true"
            aria-invalid={fieldError ? "true" : undefined}
            aria-describedby={fieldError ? "idea-hint idea-error" : "idea-hint"}
            placeholder="For example: a raised bed for tomatoes, or a small playhouse for two kids"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div id="idea-hint" className="field-hint">
            {description.length}/{MAX_DESCRIPTION_LENGTH} characters
          </div>
          {fieldError && <div id="idea-error" className="flag error" role="alert">{fieldError}</div>}
          <button type="submit" className="btn-primary" disabled={loading} aria-disabled={loading}>
            {loading ? "Searching…" : "Find matching projects"}
          </button>
        </form>

        <div className="sr-only" role="status" aria-live="polite">
          {loading && "Searching the project library."}
          {status === "done" && result && (result.noMatch
            ? "No close matches found."
            : `${result.matches.length} matching ${result.matches.length === 1 ? "project" : "projects"} found.`)}
        </div>

        {(status === "error" || status === "unavailable") && (
          <div className={`flag ${status === "error" ? "error" : "warn"}`} role={status === "error" ? "alert" : "status"}>
            <div>
              <strong>{status === "error" ? "Something went wrong." : "Idea search isn't available."}</strong> {message}
            </div>
          </div>
        )}

        {status === "done" && result && (
          <section ref={resultsRef} tabIndex={-1} aria-labelledby="idea-results-title" className="idea-results">
            <h2 id="idea-results-title" style={{ fontSize: 18, marginBottom: 12 }}>
              {result.noMatch ? "No close matches" : "Similar projects"}
            </h2>

            {!result.noMatch && (
              <ul className="match-list">
                {result.matches.map(({ project, matchPercent, reason }) => (
                  <li key={project.id} className="match-card">
                    <div className="match-card-top">
                      <h3 style={{ fontSize: 16 }}>
                        <button type="button" className="card-link" onClick={() => onSelectProject(project.id)}>
                          {project.name}
                        </button>
                      </h3>
                      <span className="match-percent">{matchPercent}% match</span>
                    </div>
                    <div
                      className="match-bar"
                      role="progressbar"
                      aria-label={`${project.name} match`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={matchPercent}
                    >
                      <div className="match-bar-fill" style={{ width: `${matchPercent}%` }} />
                    </div>
                    <div className="tag-row">
                      <span className={`tag ${project.category === "chore_easing" ? "chore" : ""}`}>
                        {CATEGORY_LABELS[project.category]}
                      </span>
                      <span className="tag">{project.build_time_hours.min}&ndash;{project.build_time_hours.max} hrs</span>
                      <span className="tag">{SKILL_LABELS[project.skill_level]}</span>
                    </div>
                    {reason && <p className="match-reason">{reason}</p>}
                  </li>
                ))}
              </ul>
            )}

            {result.noMatch && (
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
                Nothing in the library is close to what you described. Try different words, or start a custom build.
              </p>
            )}

            <div className="custom-path">
              <h3 style={{ fontSize: 15, marginBottom: 6 }}>Want something different?</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                Custom builds can't be saved yet. We're still deciding how they're stored, so for now this
                isn't something you can submit.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
