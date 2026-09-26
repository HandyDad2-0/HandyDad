import { useState } from "react";
import {
  initialSubmissions,
  CHALLENGE_MONTH_LABEL,
  VOTING_CLOSES_LABEL,
} from "../data/challengeSubmissions.js";
import { sortByVotes, castVote, getVotedIds, markVoted } from "../lib/challenge.js";

// Sprint 1: Monthly Build Challenge — frontend only (voting UI + leaderboard).
// Backend piece (submission storage, vote counting, monthly reset) is
// Razee's card. See src/lib/challenge.js and src/data/challengeSubmissions.js
// for what's mocked here and how it's meant to be swapped later.
export default function MonthlyChallenge() {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [votedIds, setVotedIds] = useState(getVotedIds);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const ranked = sortByVotes(submissions);

  function handleVote(submissionId) {
    if (votedIds.has(submissionId)) return;
    setSubmissions((prev) => castVote(prev, submissionId));
    setVotedIds((prev) => markVoted(submissionId, prev));
  }

  function handleAddSubmission({ title, builderName }) {
    const id = `sub-${Date.now()}`;
    setSubmissions((prev) => [...prev, { id, title, builderName, votes: 0, photoLabel: "[photo]" }]);
    setShowSubmitForm(false);
  }

  return (
    <div className="main-content">
      <div className="challenge-banner">
        <div>
          <span className="eyebrow">This Month's Challenge</span>
          <h2 style={{ fontSize: 22, color: "white", marginTop: 8 }}>{CHALLENGE_MONTH_LABEL}</h2>
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
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{VOTING_CLOSES_LABEL}</span>
      </div>

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
                disabled={hasVoted}
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

  function handleSubmit() {
    if (!title.trim() || !builderName.trim()) {
      setError("Enter a build title and your name before submitting.");
      return;
    }
    setError(null);
    onSubmit({ title: title.trim(), builderName: builderName.trim() });
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
        {error && <div className="flag error">{error}</div>}
        <p className="empty-note">
          Photo upload isn't wired up yet — this is just the frontend form. Real submission storage is Razee's backend piece.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>
  );
}
