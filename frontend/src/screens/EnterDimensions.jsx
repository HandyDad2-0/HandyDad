import { useState } from "react";
import { getProjectById } from "../data/projects.js";

export default function EnterDimensions({ projectId, onBack, onSubmit }) {
  const project = getProjectById(projectId);
  const [form, setForm] = useState({
    length_ft: "",
    width_ft: "",
    clearance_ft: "",
    sloped: false,
    hasTree: false,
    hasFenceLine: false,
    hasUtilityLines: false,
  });
  const [error, setError] = useState(null);

  if (!project) return <p className="main-content">Project not found.</p>;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit() {
    const { length_ft, width_ft, clearance_ft } = form;
    // NF2: clear, specific error messages for invalid/incomplete entries
    // rather than failing silently.
    if (!length_ft || !width_ft || !clearance_ft) {
      setError("Enter length, width, and clearance before checking your space.");
      return;
    }
    if ([length_ft, width_ft, clearance_ft].some((v) => Number(v) <= 0)) {
      setError("Dimensions must be greater than zero.");
      return;
    }
    setError(null);
    onSubmit({
      ...form,
      length_ft: Number(length_ft),
      width_ft: Number(width_ft),
      clearance_ft: Number(clearance_ft),
    });
  }

  return (
    <div className="main-content" style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <button className="back-link" onClick={onBack}>&larr; Back to {project.name}</button>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Enter Your Space Dimensions (R3)</h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            This project needs at least {project.footprint.length_ft}&times;{project.footprint.width_ft} ft
            with {project.clearance_ft} ft of clearance.
          </p>
        </div>

        <div className="form-card">
          <div className="form-grid-3">
            <div>
              <label htmlFor="len">Length (ft)</label>
              <input id="len" type="number" value={form.length_ft} onChange={(e) => update("length_ft", e.target.value)} />
            </div>
            <div>
              <label htmlFor="wid">Width (ft)</label>
              <input id="wid" type="number" value={form.width_ft} onChange={(e) => update("width_ft", e.target.value)} />
            </div>
            <div>
              <label htmlFor="clr">Clearance (ft)</label>
              <input id="clr" type="number" value={form.clearance_ft} onChange={(e) => update("clearance_ft", e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ marginBottom: 10 }}>Known obstacles nearby</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CheckRow label="Sloped ground" checked={form.sloped} onChange={(v) => update("sloped", v)} />
              <CheckRow label="Tree or large root system in the area" checked={form.hasTree} onChange={(v) => update("hasTree", v)} />
              <CheckRow label="Fence line or property boundary nearby" checked={form.hasFenceLine} onChange={(v) => update("hasFenceLine", v)} />
              <CheckRow label="Known underground utility lines" checked={form.hasUtilityLines} onChange={(v) => update("hasUtilityLines", v)} />
            </div>
          </div>

          {error && <div className="flag error">{error}</div>}
        </div>

        <button className="btn-primary" onClick={handleSubmit}>
          Check Complications &amp; Get Materials List
        </button>
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label className="checkbox-row" style={{ cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18 }} />
      {label}
    </label>
  );
}
