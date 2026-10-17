import { useEffect, useState } from "react";
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

  async function handleVote(submissionId) {
    if (votedIds.has(submissionId) || pendingVoteId) return;
    setVoteError(null);
    setPendingVoteId(submissionId);
    try {
      const result = await voteForSubmission(submissionId);
      if (result.ok) {
        replaceSubmission(result.submission);
        setVotedIds((prev) => rememberVoted(submissionId, prev));
      } else if (result.reason === "already_voted") {
        // Server already has a vote from this browser (e.g. site data was
        // cleared locally); show the voted state and the real count.
        if (result.submission) replaceSubmission(result.submission);
        setVotedIds((prev) => rememberVoted(submissionId, prev));
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
  }

  if (loadError) {
    return (
      <div className="main-content">
        <div className="flag error" role="alert">
          <div>
            <strong>Couldn't load the Monthly Challenge.</strong> {loadError} Make sure the backend is running
            (<code>npm start</code> in <code>backend/</code>).
          </div>
        </div>
        <button className="btn-secondary" onClick={load}>Try again</button>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="main-content">
        <p className="empty-note" role="status">Loading this month's challenge&hellip;</p>
      </div>
    );
  }

  const ranked = rankSubmissions(challenge.submissions);

  return (
    <div className="main-content">
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
        <h3 style={{ fontSize: 18 }}>Leaderboard</h3>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{challenge.votingClosesLabel}</span>
      </div>

      {voteError && <div className="flag error" role="alert">{voteError}</div>}

      {ranked.length === 0 && (
        <p className="empty-note">No builds have been submitted this month yet. Be the first!</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ranked.map((s, i) => {
          const rank = i + 1;
          const hasVoted = votedIds.has(s.id);
          return (
            <div key={s.id} className={`leaderboard-row ${rank === 1 ? "rank-1" : ""}`}>
              <div className="rank-badge">{rank}</div>
              <div className="submission-photo">{s.photoLabel}</div>
              <div style={{ flexGrow: 1 }}>
                <h4 style={{ fontSize: 15 }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>by {s.builderName}</p>
              </div>
              <button
                className={`vote-btn ${hasVoted ? "voted" : ""}`}
                onClick={() => handleVote(s.id)}
                disabled={hasVoted || pendingVoteId !== null}
                aria-label={hasVoted ? `Already voted for ${s.title}` : `Vote for ${s.title}`}
              >
                <HeartIcon filled={hasVoted} />
                {s.votes}
              </button>
            </div>
          );
        })}
      </div>

      {showSubmitForm && (
        <SubmitBuildModal onCancel={() => setShowSubmitForm(false)} onSubmit={handleAddSubmission} />
      )}
    </div>
  );
}

function HeartIcon({ filled }) {
  const color = filled ? "var(--accent)" : "var(--text-muted)";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2">
      <path d="M12 21s-6.7-4.35-9.3-8.6C1.1 9.6 2 6.3 5 5.3c1.9-.6 3.8.1 5 1.7 1.2-1.6 3.1-2.3 5-1.7 3 1 3.9 4.3 2.3 7.1C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

function SubmitBuildModal({ onCancel, onSubmit }) {
  const [title, setTitle] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !builderName.trim()) {
      setError("Enter a build title and your name before submitting.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), builderName: builderName.trim() });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="form-card" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18 }}>Submit Your Build</h3>
        <div>
          <label htmlFor="build-title">Build title</label>
          <input
            id="build-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14 }}
          />
        </div>
        <div>
          <label htmlFor="build-name">Your name</label>
          <input
            id="build-name"
            type="text"
            value={builderName}
            onChange={(e) => setBuilderName(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14 }}
          />
        </div>
        {error && <div className="flag error" role="alert">{error}</div>}
        <p className="empty-note">
          Photo upload isn't available yet.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting\u2026" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
