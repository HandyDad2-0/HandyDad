import { useEffect, useState } from "react";
import { getProjectById } from "../data/projects.js";
import { checkDimensionFit } from "../lib/dimensionFitApi.js";
import { getTierBreakdown } from "../lib/materials.js";

const TIER_LABELS = { pine: "Pine (Budget)", cedar: "Cedar (Mid-Range)", composite: "Composite (Premium)" };

// Flag severity -> CSS class, per Austin's "Basic Safety/Complication
// Flagging Rules" doc: blocking = red, advisory = yellow, and utility-line
// obstacle flags (advisory-strong) get a visually stronger yellow treatment.
const SEVERITY_CLASS = {
  blocking: "error",
  advisory: "warn",
  "advisory-strong": "warn-strong",
};

// Severity is also spelled out in text so it isn't conveyed by color alone.
const SEVERITY_LABEL = {
  blocking: "Blocking:",
  advisory: "Advisory:",
  "advisory-strong": "Important advisory:",
};

export default function SpaceCheckResults({ projectId, input, onEditDimensions }) {
  const project = getProjectById(projectId);
  const [flags, setFlags] = useState(null);
  const [loadError, setLoadError] = useState(null);

  function load() {
    setLoadError(null);
    setFlags(null);
    checkDimensionFit({
      projectId,
      length_ft: input.length_ft,
      width_ft: input.width_ft,
      clearance_ft: input.clearance_ft,
      entered_height_ft: input.entered_height_ft ?? null,
      obstacles: {
        sloped: input.sloped,
        attachedToStructure: input.attachedToStructure,
        hasTree: input.hasTree,
        hasFenceLine: input.hasFenceLine,
        hasUtilityLines: input.hasUtilityLines,
      },
    })
      .then((result) => setFlags(result.flags))
      .catch((err) => setLoadError(err.message));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [projectId, input]);

  if (!project) return <p className="main-content">Project not found.</p>;

  if (loadError) {
    return (
      <div className="main-content">
        <button className="back-link" onClick={onEditDimensions}>&larr; Edit dimensions</button>
        <div className="flag error" role="alert">
          <div>
            <strong>Couldn't check your space.</strong> {loadError} Make sure the backend is running
            (<code>npm start</code> in <code>backend/</code>).
          </div>
        </div>
        <button className="btn-secondary" onClick={load}>Try again</button>
      </div>
    );
  }

  if (flags === null) {
    return (
      <div className="main-content">
        <button className="back-link" onClick={onEditDimensions}>&larr; Edit dimensions</button>
        <p className="empty-note" role="status">Checking your space&hellip;</p>
      </div>
    );
  }

  const { source, tiers } = getTierBreakdown(project);

  return (
    <div className="main-content">
      <button className="back-link" onClick={onEditDimensions}><span aria-hidden="true">&larr;</span> Edit dimensions</button>

      <h1 style={{ fontSize: 22, marginBottom: 6 }}>{project.name} &mdash; Your Space Check (R4)</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 22 }}>
        Based on a {input.length_ft}&times;{input.width_ft} ft area with {input.clearance_ft} ft clearance
      </p>

      {/* R4: flags always show above the materials cards, never below, and never block the user from seeing them. */}
      <section aria-labelledby="flags-heading">
        <h2 id="flags-heading" className="sr-only">Complications for your space</h2>
        {flags.length === 0 && (
          <div className="flag ok">
            <strong>No complications found for this space</strong>
          </div>
        )}
        {flags.map((flag, i) => (
          <div className={`flag ${SEVERITY_CLASS[flag.severity]}`} key={i}>
            <div>
              <span className="flag-label">{SEVERITY_LABEL[flag.severity]}</span>
              {flag.text}
            </div>
          </div>
        ))}
      </section>

      <h2 style={{ fontSize: 18, margin: "24px 0 4px" }}>Materials List &mdash; Choose Your Budget Tier (R5)</h2>
      {source === "estimate" && (
        <p className="empty-note">
          This project doesn't have a full itemized materials list yet &mdash; showing the hand-estimated range until Austin adds a complete BOM.
        </p>
      )}
      <div className="tier-grid">
        {["pine", "cedar", "composite"].map((tier) => {
          const t = tiers[tier];
          return (
            <div key={tier} className={`tier-card ${tier === "cedar" ? "popular" : ""}`}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>
                {tier === "cedar" ? "Most Popular" : tier === "pine" ? "Budget" : "Premium"}
              </div>
              <h3 style={{ fontSize: 18, marginTop: 4 }}>{TIER_LABELS[tier]}</h3>
              <div className="tier-price">
                {t.total != null
                  ? `$${t.total.toFixed(2)}`
                  : t.estimateRange
                    ? `$${t.estimateRange[0]}–$${t.estimateRange[1]}`
                    : "N/A"}
              </div>
              {t.items.length > 0 ? (
                <ul style={{ fontSize: 13, color: "#4a4133", paddingLeft: 18, margin: 0 }}>
                  {t.items.map((item) => (
                    <li key={item.id}>{item.category}: {item.quantity} {item.unit} &mdash; ${item.lineCost.toFixed(2)}</li>
                  ))}
                </ul>
              ) : (
                <p className="empty-note">Estimated range, not yet itemized.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
