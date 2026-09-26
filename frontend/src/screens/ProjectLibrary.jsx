import { useMemo, useState } from "react";
import { projects, CATEGORY_LABELS, SKILL_LABELS, timeBucket } from "../data/projects.js";

export default function ProjectLibrary({ onSelectProject }) {
  const [category, setCategory] = useState("all");
  const [time, setTime] = useState("all");
  const [skill, setSkill] = useState("all");

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (time !== "all" && timeBucket(p) !== time) return false;
      if (skill !== "all" && p.skill_level !== skill) return false;
      return true;
    });
  }, [category, time, skill]);

  return (
    <>
      <div className="filter-bar">
        <div className="filter-group">
          <span>Category</span>
          <div className="chip-row">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>All Projects</Chip>
            <Chip active={category === "kid_structure"} onClick={() => setCategory("kid_structure")}>Kid Structures</Chip>
            <Chip active={category === "chore_easing"} onClick={() => setCategory("chore_easing")}>Chore-Easing</Chip>
          </div>
        </div>
        <div className="filter-group">
          <span>Time Commitment (R6)</span>
          <div className="chip-row">
            <Chip active={time === "all"} onClick={() => setTime("all")}>Any</Chip>
            <Chip active={time === "weekend"} onClick={() => setTime("weekend")}>I have a weekend</Chip>
            <Chip active={time === "week"} onClick={() => setTime("week")}>I have a week</Chip>
          </div>
        </div>
        <div className="filter-group">
          <span>Skill Level (R6)</span>
          <div className="chip-row">
            <Chip active={skill === "all"} onClick={() => setSkill("all")}>Any</Chip>
            <Chip active={skill === "beginner"} onClick={() => setSkill("beginner")}>First-Timer</Chip>
            <Chip active={skill === "intermediate"} onClick={() => setSkill("intermediate")}>Some Experience</Chip>
          </div>
        </div>
      </div>

      <div className="idea-box">
        <div>
          <strong>Have something specific in mind?</strong>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Free-text idea search is planned for Sprint 1 (see Trello) — not wired up in this scaffold yet.
          </div>
        </div>
      </div>

      <div className="main-content">
        <h2 style={{ marginBottom: 16, fontSize: 20 }}>{filtered.length} projects</h2>
        <div className="project-grid">
          {filtered.map((p) => (
            <button key={p.id} className="project-card" onClick={() => onSelectProject(p.id)}>
              <div className="project-photo">[project photo]</div>
              <div className="project-card-body">
                <h3 style={{ fontSize: 16 }}>{p.name}</h3>
                <div className="tag-row">
                  <span className={`tag ${p.category === "chore_easing" ? "chore" : ""}`}>
                    {CATEGORY_LABELS[p.category]}
                  </span>
                  <span className="tag">{timeBucket(p) === "weekend" ? "Weekend" : "Week"}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {SKILL_LABELS[p.skill_level]}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="empty-note">No projects match these filters yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button className={`chip ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
