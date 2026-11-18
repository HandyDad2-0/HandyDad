import { useState } from "react";
import { getProjectById } from "../data/projects.js";
import { convert, formatLength } from "../lib/units.js";

const UNIT_LABEL = { ft: "ft", m: "m" };

// docs/space-measurement.md "Input Fields & Units": surface type is its own
// field, separate from "known obstructions" below. Only "sloped" currently
// drives a flagging rule (dimension-fit-engine.js's obstacle_conflict check
// via obstacles_relevant); grass/concrete/deck are collected for now with
// no rule attached, same as any other field waiting on a future rule.
const SURFACE_TYPES = [
  { value: "flat", label: "Flat" },
  { value: "sloped", label: "Sloped" },
  { value: "grass", label: "Grass" },
  { value: "concrete", label: "Concrete" },
  { value: "deck", label: "Deck" },
];

export default function EnterDimensions({ projectId, onBack, onSubmit }) {
  const project = getProjectById(projectId);
  // docs/space-measurement.md "Units decision": feet is the default input
  // unit, with a meters toggle for accessibility. Dimension fields are
  // always stored in `form` as plain numbers in whichever `unit` is
  // currently selected - they get converted to feet once, at submit time,
  // not on every keystroke.
  const [unit, setUnit] = useState("ft");
  const [form, setForm] = useState({
    length_ft: "",
    width_ft: "",
    clearance_ft: "",
    entered_height_ft: "",
    setback_required_ft: "",
    distance_to_property_line_ft: "",
    surfaceType: "flat",
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

  // Switching units converts whatever the user already typed, so the
  // physical size they entered is preserved instead of silently becoming a
  // different space under the new unit's label.
  function changeUnit(nextUnit) {
    if (nextUnit === unit) return;
    setForm((f) => {
      const next = { ...f };
      for (const field of ["length_ft", "width_ft", "clearance_ft", "entered_height_ft", "setback_required_ft", "distance_to_property_line_ft"]) {
        if (f[field] === "" || Number.isNaN(Number(f[field]))) continue;
        next[field] = Math.round(convert(Number(f[field]), unit, nextUnit) * 100) / 100;
      }
      return next;
    });
    setUnit(nextUnit);
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
    // The setback check only means something as a pair - catch a half-filled
    // pair here rather than silently dropping the one value the user did enter.
    const setbackFilled = [form.setback_required_ft !== "", form.distance_to_property_line_ft !== ""];
    if (setbackFilled[0] !== setbackFilled[1]) {
      fail("Enter both the required setback and the distance to the property line, or leave both blank.", ["setback-required", "setback-distance"]);
      return;
    }
    setError(null);
    setInvalid([]);
    // The API and dimension-fit engine work in feet only (see units.js);
    // convert once here, at the boundary, so nothing downstream needs to
    // know or care which unit the user actually typed in. Rounded to 2
    // decimal places (hundredths of a foot, sub-centimeter) so a meters
    // round-trip doesn't leak float noise like 10.006561679790027 into the
    // results screen.
    const toFeet = (value) => Math.round(convert(Number(value), unit, "ft") * 100) / 100;
    // Setback is optional and only meaningful as a pair (docs/space-measurement.md
    // "Setbacks") - if the user only filled in one of the two fields, there's
    // nothing to compare, so send null rather than guessing at the other.
    const hasSetbackPair = form.setback_required_ft !== "" && form.distance_to_property_line_ft !== "";
    onSubmit({
      ...form,
      length_ft: toFeet(length_ft),
      width_ft: toFeet(width_ft),
      clearance_ft: toFeet(clearance_ft),
      entered_height_ft: needsHeight ? toFeet(entered_height_ft) : null,
      setback_required_ft: hasSetbackPair ? toFeet(form.setback_required_ft) : null,
      distance_to_property_line_ft: hasSetbackPair ? toFeet(form.distance_to_property_line_ft) : null,
      // The dimension-fit engine only knows a "sloped" boolean (Austin's
      // obstacle_conflict rule) - grass/concrete/deck don't have a rule
      // attached yet, so only "sloped" affects the space check for now.
      sloped: form.surfaceType === "sloped",
    });
  }

  return (
    <div className="main-content" style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <button type="button" className="back-link" onClick={onBack}><span aria-hidden="true">&larr;</span> Back to {project.name}</button>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Enter Your Space Dimensions (R3)</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            This project needs at least {formatLength(convert(project.footprint.length_ft, "ft", unit), unit)}
            &times;{formatLength(convert(project.footprint.width_ft, "ft", unit), unit)}
            {" "}with {formatLength(convert(project.clearance_ft, "ft", unit), unit)} of clearance.
          </p>
          <div className="chip-row" role="group" aria-label="Units" style={{ marginTop: 10 }}>
            <button type="button" className={`chip ${unit === "ft" ? "active" : ""}`} aria-pressed={unit === "ft"} onClick={() => changeUnit("ft")}>
              Feet
            </button>
            <button type="button" className={`chip ${unit === "m" ? "active" : ""}`} aria-pressed={unit === "m"} onClick={() => changeUnit("m")}>
              Meters
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="form-card">
          <div className="form-grid-3">
            <div>
              <label htmlFor="len">Length ({UNIT_LABEL[unit]})</label>
              <input id="len" type="number" inputMode="decimal" min="0" step="any" required aria-required="true" aria-invalid={invalid.includes("len")} aria-describedby={error ? "dim-error" : undefined} value={form.length_ft} onChange={(e) => update("length_ft", e.target.value)} />
            </div>
            <div>
              <label htmlFor="wid">Width ({UNIT_LABEL[unit]})</label>
              <input id="wid" type="number" inputMode="decimal" min="0" step="any" required aria-required="true" aria-invalid={invalid.includes("wid")} aria-describedby={error ? "dim-error" : undefined} value={form.width_ft} onChange={(e) => update("width_ft", e.target.value)} />
            </div>
            <div>
              <label htmlFor="clr">Clearance ({UNIT_LABEL[unit]})</label>
              <input id="clr" type="number" inputMode="decimal" min="0" step="any" required aria-required="true" aria-invalid={invalid.includes("clr")} aria-describedby={error ? "dim-error" : undefined} value={form.clearance_ft} onChange={(e) => update("clearance_ft", e.target.value)} />
            </div>
          </div>

          {needsHeight && (
            <div>
              <label htmlFor="height">
                Height of build ({UNIT_LABEL[unit]}) &mdash; this project needs engineer sign-off above{" "}
                {formatLength(convert(project.max_unassisted_height_ft, "ft", unit), unit)}
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
            <legend>Surface type</legend>
            <div className="chip-row" role="radiogroup" aria-label="Surface type">
              {SURFACE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`chip ${form.surfaceType === type.value ? "active" : ""}`}
                  role="radio"
                  aria-checked={form.surfaceType === type.value}
                  onClick={() => update("surfaceType", type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="obstacles">
            <legend>Known obstacles nearby</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CheckRow label="Attached to an existing structure (deck, wall, or roof)" checked={form.attachedToStructure} onChange={(v) => update("attachedToStructure", v)} />
              <CheckRow label="Tree or large root system in the area" checked={form.hasTree} onChange={(v) => update("hasTree", v)} />
              <CheckRow label="Fence line or property boundary nearby" checked={form.hasFenceLine} onChange={(v) => update("hasFenceLine", v)} />
              <CheckRow label="Known underground utility lines" checked={form.hasUtilityLines} onChange={(v) => update("hasUtilityLines", v)} />
            </div>
          </fieldset>

          <fieldset className="obstacles">
            <legend>
              Setback from your property line (optional) &mdash; a setback is the minimum distance local rules
              require between a structure and your property line. HandyDad doesn&rsquo;t know your local rule;
              check your city or county, or a recent survey/plot plan, if you want this checked.
            </legend>
            <div className="form-grid-3">
              <div>
                <label htmlFor="setback-required">Required setback ({UNIT_LABEL[unit]})</label>
                <input
                  id="setback-required"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  aria-invalid={invalid.includes("setback-required")}
                  aria-describedby={error ? "dim-error" : undefined}
                  value={form.setback_required_ft}
                  onChange={(e) => update("setback_required_ft", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="setback-distance">Distance to property line ({UNIT_LABEL[unit]})</label>
                <input
                  id="setback-distance"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  aria-invalid={invalid.includes("setback-distance")}
                  aria-describedby={error ? "dim-error" : undefined}
                  value={form.distance_to_property_line_ft}
                  onChange={(e) => update("distance_to_property_line_ft", e.target.value)}
                />
              </div>
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
