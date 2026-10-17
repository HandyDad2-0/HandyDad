import { useEffect, useRef, useState } from "react";
import {
  fetchChallenge,
  submitBuild,
  voteForSubmission,
  getVotedIds,
  rememberVoted,
  rankSubmissions,
} from "../lib/challengeApi.js";

// Monthly Build Challenge — voting UI + leaderboard, backed by Razee's
// /api/challenge endpoints (see docs/monthly-build-challenge-backend.md).
// Start the API with `npm start` in backend/; the Vite dev server proxies
// /api to it (see vite.config.js).
export default function MonthlyChallenge() {
  const [challenge, setChallenge] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [votedIds, setVotedIds] = useState(getVotedIds);
  const [voteError, setVoteError] = useState(null);
  const [pendingVoteId, setPendingVoteId] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  function load() {
    setLoadError(null);
    fetchChallenge().then(setChallenge).catch((err) => setLoadError(err.message));
  }

  useEffect(load, []);

  function replaceSubmission(updated) {
    setChallenge((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) => (s.id === updated.id ? updated : s)),
    }));
  }

  async function handleVote(submission) {
    // aria-disabled (not disabled) keeps the voted button focusable, so the
    // handler has to ignore repeat activations itself.
    if (votedIds.has(submission.id) || pendingVoteId) return;
    setVoteError(null);
    setPendingVoteId(submission.id);
    try {
      const result = await voteForSubmission(submission.id);
      if (result.ok) {
        replaceSubmission(result.submission);
        setVotedIds((prev) => rememberVoted(submission.id, prev));
        setAnnouncement(`Vote recorded for ${submission.title}. It now has ${result.submission.votes} votes.`);
      } else if (result.reason === "already_voted") {
        // Server already has a vote from this browser (e.g. site data was
        // cleared locally); show the voted state and the real count.
        if (result.submission) replaceSubmission(result.submission);
        setVotedIds((prev) => rememberVoted(submission.id, prev));
        setAnnouncement(`You have already voted for ${submission.title}.`);
      } else if (result.reason === "not_found") {
        setVoteError("That build is no longer in this month's challenge. The list has been refreshed.");
        load();
      } else {
        setVoteError("Your vote couldn't be recorded. Please try again.");
      }
    } catch (err) {
      setVoteError(err.message);
    } finally {
      setPendingVoteId(null);
    }
  }

  async function handleAddSubmission(values) {
    const { challenge: updated } = await submitBuild(values);
    setChallenge(updated);
    setShowSubmitForm(false);
    setAnnouncement(`${values.title} was submitted to this month's challenge.`);
  }

  const ranked = challenge ? rankSubmissions(challenge.submissions) : [];

  // The <h1> sits in the same place in every state (loading, error, loaded)
  // so it keeps the focus App.jsx gives it after navigating here.
  return (
    <div className="main-content">
      <h1 className="sr-only">Monthly Challenge</h1>

      {loadError && (
        <>
          <div className="flag error" role="alert">
            <div>
              <strong>Couldn't load the Monthly Challenge.</strong> {loadError} Make sure the backend is running
              (<code>npm start</code> in <code>backend/</code>).
            </div>
          </div>
          <button className="btn-secondary" onClick={load}>Try again</button>
        </>
      )}

      {!loadError && !challenge && (
        <p className="empty-note" role="status">Loading this month's challenge&hellip;</p>
      )}

      {!loadError && challenge && (
        <>
          <div className="challenge-banner">
            <div>
              <span className="eyebrow">This Month's Challenge</span>
              <h2 style={{ fontSize: 22, color: "white", marginTop: 8 }}>{challenge.monthLabel}</h2>
              <p>
                Submit a custom project you built with HandyDad. The community votes, and the
                winning build gets featured on the homepage next month.
              </p>
            </div>
            <button className="btn-primary" style={{ whiteSpace: "nowrap" }} onClick={() => setShowSubmitForm(true)}>
              Submit Your Build
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Leaderboard</h2>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{challenge.votingClosesLabel}</span>
          </div>

          {voteError && <div className="flag error" role="alert">{voteError}</div>}

          {ranked.length === 0 && (
            <p className="empty-note">No builds have been submitted this month yet. Be the first!</p>
          )}

          {ranked.length > 0 && (
            <ol className="leaderboard" aria-label="Builds ranked by votes">
              {ranked.map((s, i) => {
                const rank = i + 1;
                const hasVoted = votedIds.has(s.id);
                return (
                  <li key={s.id} className={`leaderboard-row ${rank === 1 ? "rank-1" : ""}`}>
                    {/* The <ol> already numbers the rows for assistive tech. */}
                    <div className="rank-badge" aria-hidden="true">{rank}</div>
                    <div className="submission-photo" aria-hidden="true">{s.photoLabel}</div>
                    <div style={{ flexGrow: 1 }}>
                      <h3 style={{ fontSize: 15 }}>{s.title}</h3>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>by {s.builderName}</p>
                    </div>
                    <button
                      className={`vote-btn ${hasVoted ? "voted" : ""}`}
                      onClick={() => handleVote(s)}
                      aria-disabled={hasVoted || pendingVoteId !== null}
                      aria-label={`${hasVoted ? "You voted for" : "Vote for"} ${s.title}. ${s.votes} votes`}
                    >
                      <HeartIcon filled={hasVoted} />
                      {s.votes}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}

      {/* Announces vote and submission results to screen readers. */}
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>

      {showSubmitForm && (
        <SubmitBuildModal onCancel={() => setShowSubmitForm(false)} onSubmit={handleAddSubmission} />
      )}
    </div>
  );
}

function HeartIcon({ filled }) {
  const color = filled ? "var(--accent)" : "var(--text-muted)";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" aria-hidden="true" focusable="false">
      <path d="M12 21s-6.7-4.35-9.3-8.6C1.1 9.6 2 6.3 5 5.3c1.9-.6 3.8.1 5 1.7 1.2-1.6 3.1-2.3 5-1.7 3 1 3.9 4.3 2.3 7.1C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function SubmitBuildModal({ onCancel, onSubmit }) {
  const [title, setTitle] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [error, setError] = useState(null);
  const [invalid, setInvalid] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const titleRef = useRef(null);

  // Move focus into the dialog on open and give it back to whatever opened
  // it on close.
  useEffect(() => {
    const opener = document.activeElement;
    titleRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Escape closes; Tab/Shift+Tab wrap inside the dialog instead of
  // escaping to the page behind it.
  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const bad = [];
    if (!title.trim()) bad.push("build-title");
    if (!builderName.trim()) bad.push("build-name");
    if (bad.length > 0) {
      setError("Enter a build title and your name before submitting.");
      setInvalid(bad);
      document.getElementById(bad[0])?.focus();
      return;
    }
    setError(null);
    setInvalid([]);
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), builderName: builderName.trim() });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const describedBy = error ? "submit-error" : undefined;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="form-card"
        style={{ width: 420, maxWidth: "calc(100vw - 32px)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 id="submit-title" style={{ fontSize: 18 }}>Submit Your Build</h2>
        <form className="modal-form" noValidate onSubmit={handleSubmit}>
        <div>
          <label htmlFor="build-title">Build title</label>
          <input
            id="build-title"
            ref={titleRef}
            type="text"
            required
            aria-required="true"
            aria-invalid={invalid.includes("build-title")}
            aria-describedby={describedBy}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="build-name">Your name</label>
          <input
            id="build-name"
            type="text"
            required
            aria-required="true"
            aria-invalid={invalid.includes("build-name")}
            aria-describedby={describedBy}
            value={builderName}
            onChange={(e) => setBuilderName(e.target.value)}
          />
        </div>
        {error && <div id="submit-error" className="flag error" role="alert">{error}</div>}
        <p className="empty-note">Photo upload isn't available yet.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}
