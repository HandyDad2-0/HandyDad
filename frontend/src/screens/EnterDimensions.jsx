import { useState } from "react";
import { getProjectById } from "../data/projects.js";

export default function EnterDimensions({ projectId, onBack, onSubmit }) {
  const project = getProjectById(projectId);
  const [form, setForm] = useState({
    length_ft: "",
    width_ft: "",
    clearance_ft: "",
    entered_height_ft: "",
    sloped: false,
    attachedToStructure: false,
    hasTree: false,
    hasFenceLine: false,
    hasUtilityLines: false,
  });
  const [error, setError] = useState(null);
  const [invalid, setInvalid] = useState([]); // ids of fields that failed validation

  if (!project) return <p className="main-content">Project not found.</p>;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Rule 3 (docs/Basic Safety Complication Flagging Rules) only needs an
  // entered height to compare against max_unassisted_height_ft when the
  // project actually has that threshold — "where the project asks for it."
  const needsHeight = project.max_unassisted_height_ft != null;

  function fail(message, badIds) {
    setError(message);
    setInvalid(badIds);
    // Move focus to the first problem field so keyboard and screen-reader
    // users land on what needs fixing; the message itself is announced
    // through role="alert".
    document.getElementById(badIds[0])?.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const { length_ft, width_ft, clearance_ft, entered_height_ft } = form;
    const fields = [
      ["len", length_ft],
      ["wid", width_ft],
      ["clr", clearance_ft],
      ...(needsHeight ? [["height", entered_height_ft]] : []),
    ];
    // NF2: clear, specific error messages for invalid/incomplete entries
    // rather than failing silently.
    const missing = fields.filter(([, v]) => !v).map(([id]) => id);
    if (missing.length > 0) {
      fail(
        needsHeight
          ? "Enter length, width, clearance, and height before checking your space."
          : "Enter length, width, and clearance before checking your space.",
        missing
      );
      return;
    }
    const notPositive = fields.filter(([, v]) => Number(v) <= 0).map(([id]) => id);
    if (notPositive.length > 0) {
      fail("Dimensions must be greater than zero.", notPositive);
      return;
    }
    setError(null);
    setInvalid([]);
    onSubmit({
      ...form,
      length_ft: Number(length_ft),
      width_ft: Number(width_ft),
      clearance_ft: Number(clearance_ft),
      entered_height_ft: needsHeight ? Number(entered_height_ft) : null,
    });
  }

  return (
    <div className="main-content" style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <button type="button" className="back-link" onClick={onBack}><span aria-hidden="true">&larr;</span> Back to {project.name}</button>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Enter Your Space Dimensions (R3)</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            This project needs at least {project.footprint.length_ft}&times;{project.footprint.width_ft} ft
            with {project.clearance_ft} ft of clearance.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="form-card">
          <div className="form-grid-3">
            <div>
              <label htmlFor="len">Length (ft)</label>
              <input id="len" type="number" inputMode="decimal" min="0" step="any" required aria-required="true" aria-invalid={invalid.includes("len")} aria-describedby={error ? "dim-error" : undefined} value={form.length_ft} onChange={(e) => update("length_ft", e.target.value)} />
            </div>
            <div>
              <label htmlFor="wid">Width (ft)</label>
              <input id="wid" type="number" inputMode="decimal" min="0" step="any" required aria-required="true" aria-invalid={invalid.includes("wid")} aria-describedby={error ? "dim-error" : undefined} value={form.width_ft} onChange={(e) => update("width_ft", e.target.value)} />
            </div>
            <div>
              <label htmlFor="clr">Clearance (ft)</label>
              <input id="clr" type="number" inputMode="decimal" min="0" step="any" required aria-required="true" aria-invalid={invalid.includes("clr")} aria-describedby={error ? "dim-error" : undefined} value={form.clearance_ft} onChange={(e) => update("clearance_ft", e.target.value)} />
            </div>
          </div>

          {needsHeight && (
            <div>
              <label htmlFor="height">
                Height of build (ft) &mdash; this project needs engineer sign-off above {project.max_unassisted_height_ft} ft
              </label>
              <input
                id="height"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                required
                aria-required="true"
                aria-invalid={invalid.includes("height")}
                aria-describedby={error ? "dim-error" : undefined}
                value={form.entered_height_ft}
                onChange={(e) => update("entered_height_ft", e.target.value)}
              />
            </div>
          )}

          <fieldset className="obstacles">
            <legend>Known obstacles nearby</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CheckRow label="Sloped ground" checked={form.sloped} onChange={(v) => update("sloped", v)} />
              <CheckRow label="Attached to an existing structure (deck, wall, or roof)" checked={form.attachedToStructure} onChange={(v) => update("attachedToStructure", v)} />
              <CheckRow label="Tree or large root system in the area" checked={form.hasTree} onChange={(v) => update("hasTree", v)} />
              <CheckRow label="Fence line or property boundary nearby" checked={form.hasFenceLine} onChange={(v) => update("hasFenceLine", v)} />
              <CheckRow label="Known underground utility lines" checked={form.hasUtilityLines} onChange={(v) => update("hasUtilityLines", v)} />
            </div>
          </fieldset>

          {error && <div id="dim-error" className="flag error" role="alert">{error}</div>}
        </div>

        <button type="submit" className="btn-primary">
          Check Complications &amp; Get Materials List
        </button>
        </form>
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label className="checkbox-row" style={{ cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 24, height: 24 }} />
      {label}
    </label>
  );
}
