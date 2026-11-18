// Unit conversion for the Space Measurement input (docs/space-measurement.md
// "Units decision"): feet is the default input unit, meters is the toggle,
// and every conversion is routed through centimeters as a single base unit
// so repeated back-and-forth conversions never drift.
//
// This is an input-boundary concern only: the dimension-fit API and engine
// still work entirely in feet (data/seed-projects.json is authored in feet
// by the team, and changing that schema is out of scope here). Values are
// converted to feet right before they're sent, same as today.

export const CM_PER_FT = 30.48;
export const CM_PER_M = 100;

export function ftToCm(feet) {
  return feet * CM_PER_FT;
}

export function cmToFt(cm) {
  return cm / CM_PER_FT;
}

export function metersToCm(meters) {
  return meters * CM_PER_M;
}

export function cmToMeters(cm) {
  return cm / CM_PER_M;
}

// Generic pair so callers never have to pick ftToCm vs metersToCm by hand -
// they just carry the unit alongside the value.
export function toCm(value, unit) {
  if (unit === "m") return metersToCm(value);
  return ftToCm(value);
}

export function fromCm(cm, unit) {
  if (unit === "m") return cmToMeters(cm);
  return cmToFt(cm);
}

// feet -> meters and meters -> feet always go through cm, per the "single
// base unit" decision, instead of multiplying by a direct ft<->m constant.
export function convert(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;
  return fromCm(toCm(value, fromUnit), toUnit);
}

const UNIT_LABEL = { ft: "ft", m: "m" };

// Plain-language display, e.g. "4.5 ft" or "1.37 m". Feet are shown to 1
// decimal place (tenths of a foot is normal precision for a yard/room
// measurement); meters to 2 decimal places (centimeter precision).
export function formatLength(value, unit) {
  const rounded = unit === "m" ? Math.round(value * 100) / 100 : Math.round(value * 10) / 10;
  return `${rounded} ${UNIT_LABEL[unit]}`;
}
