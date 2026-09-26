import { getProjectById, CATEGORY_LABELS, SKILL_LABELS, timeBucket } from "../data/projects.js";

export default function ProjectDetail({ projectId, onBack, onCheckSpace }) {
  const project = getProjectById(projectId);
  if (!project) return <p className="main-content">Project not found.</p>;

  return (
    <div className="main-content">
      <button className="back-link" onClick={onBack}>&larr; Back to Project Library</button>

      <div className="detail-layout">
        <div style={{ flex: "1.3", display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="detail-photo">[project photo]</div>
          <div>
            <div className="tag-row" style={{ marginBottom: 10 }}>
              <span className={`tag ${project.category === "chore_easing" ? "chore" : ""}`}>
                {CATEGORY_LABELS[project.category]}
              </span>
              <span className="tag">{timeBucket(project) === "weekend" ? "Weekend" : "Week"}</span>
              <span className="tag">{SKILL_LABELS[project.skill_level]}</span>
            </div>
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>{project.name}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#4a4133" }}>{project.description}</p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="facts-card">
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>Quick Facts (R2)</h3>
            <div className="facts-row">
              <span style={{ color: "var(--text-muted)" }}>Estimated build time</span>
              <strong>{project.build_time_hours.min}&ndash;{project.build_time_hours.max} hrs</strong>
            </div>
            <div className="facts-row">
              <span style={{ color: "var(--text-muted)" }}>Skill level</span>
              <strong>{SKILL_LABELS[project.skill_level]}</strong>
            </div>
            <div className="facts-row">
              <span style={{ color: "var(--text-muted)" }}>Required footprint</span>
              <strong>{project.footprint.length_ft}&times;{project.footprint.width_ft} ft, {project.clearance_ft} ft clearance</strong>
            </div>
            <div className="facts-row">
              <span style={{ color: "var(--text-muted)" }}>Budget estimate</span>
              <strong>
                ${project.budget_estimate_reference.pine[0]}&ndash;${project.budget_estimate_reference.composite[1]}
              </strong>
            </div>
          </div>

          <button className="btn-primary" onClick={() => onCheckSpace(project.id)}>
            Check My Space &amp; Get Materials List
          </button>
          <button className="btn-secondary">Save to My Projects</button>
        </div>
      </div>
    </div>
  );
}
