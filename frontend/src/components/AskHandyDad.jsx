import { useState } from "react";
import { askQuestion } from "../lib/qaApi.js";

// Ask HandyDad panel for a selected project. The backend is currently a stub
// (HTTP 501), so the usual outcome is an honest "not available yet" message.
// Nothing here presents an answer unless the server returns a real one.
export default function AskHandyDad({ projectId, projectName }) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState({ status: "idle" }); // idle | loading | unavailable | answered | error
  const [fieldError, setFieldError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q) {
      setFieldError("Type a question about this project first.");
      document.getElementById("ask-text")?.focus();
      return;
    }
    setFieldError("");
    setState({ status: "loading" });
    try {
      setState(await askQuestion({ projectId, question: q }));
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  const loading = state.status === "loading";

  return (
    <section className="ask-panel" aria-labelledby="ask-title">
      <h2 id="ask-title" style={{ fontSize: 15, marginBottom: 6 }}>Ask HandyDad</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 12px" }}>
        Questions about the {projectName}, such as materials or tools.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="ask-text">Your question</label>
        <textarea
          id="ask-text"
          rows={3}
          maxLength={500}
          required
          aria-required="true"
          aria-invalid={fieldError ? "true" : undefined}
          aria-describedby={fieldError ? "ask-error" : undefined}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        {fieldError && <div id="ask-error" className="flag error" role="alert">{fieldError}</div>}
        <button type="submit" className="btn-secondary" disabled={loading} aria-disabled={loading}>
          {loading ? "Sending…" : "Ask"}
        </button>
      </form>

      <div role="status" aria-live="polite">
        {loading && <span className="sr-only">Sending your question.</span>}
        {state.status === "unavailable" && (
          <div className="flag warn"><div><strong>Not available yet.</strong> {state.message}</div></div>
        )}
        {state.status === "answered" && (
          <div className="ask-answer">
            <p>{state.answer}</p>
            {state.sources.length > 0 && <p className="field-hint">Based on approved project data.</p>}
          </div>
        )}
      </div>
      {state.status === "error" && (
        <div className="flag error" role="alert"><div><strong>Couldn't send your question.</strong> {state.message}</div></div>
      )}
    </section>
  );
}
