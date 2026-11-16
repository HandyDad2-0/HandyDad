import { useState } from "react";
import { getProjectById, CATEGORY_LABELS, SKILL_LABELS } from "../data/projects.js";
import { visibleSaved } from "../lib/savedProjects.js";
import { formatHours } from "../lib/libraryFilters.js";

// My Projects: the projects saved in this browser, with a way to open or
// remove each one.
export default function MyProjects({ savedIds, storageOk, onSelectProject, onRemove, onBrowse }) {
  const projects = visibleSaved(savedIds, getProjectById);
  const [announcement, setAnnouncement] = useState("");

  function handleRemove(project) {
    onRemove(project.id);
    setAnnouncement(`${project.name} removed from My Projects.`);
    // The removed row (and its button) disappears; keep keyboard users on the
    // page instead of dropping them back to the top of the document.
    const heading = document.querySelector("main h1");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus();
  }

  return (
    <div className="main-content">
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>My Projects</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
        Projects you've saved on this device.
      </p>

      {!storageOk && (
        <div className="flag warn" role="status">
          <div>
            <strong>Saving is limited.</strong> This browser isn't letting HandyDad keep your list, so
            it will be gone when you close or reload the page.
          </div>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>

      {projects.length === 0 ? (
        <div className="empty-note" style={{ fontStyle: "normal" }}>
          <p style={{ fontSize: 15, marginBottom: 12 }}>You haven't saved any projects yet.</p>
          <button type="button" className="btn-secondary" onClick={onBrowse}>Browse the project library</button>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>
            {projects.length} saved {projects.length === 1 ? "project" : "projects"}
          </h2>
          <ul className="saved-list">
            {projects.map((p) => (
              <li key={p.id} className="saved-item">
                <div className="saved-main">
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>
                    <button type="button" className="link-button" onClick={() => onSelectProject(p.id)}>
                      {p.name}
                    </button>
                  </h3>
                  <div className="tag-row">
                    <span className={`tag ${p.category === "chore_easing" ? "chore" : ""}`}>{CATEGORY_LABELS[p.category]}</span>
                    <span className="tag">{formatHours(p.build_time_hours)}</span>
                    <span className="tag">{SKILL_LABELS[p.skill_level]}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  aria-label={`Remove ${p.name} from My Projects`}
                  onClick={() => handleRemove(p)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
