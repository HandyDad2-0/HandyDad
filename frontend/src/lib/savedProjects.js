// "My Projects": the projects a visitor has saved in this browser.
//
// Only project ids are stored (never copies of project data), so edits to
// data/seed-projects.json show up everywhere. Ids that no longer exist in the
// library are skipped when the list is shown (see `visibleSaved`).
//
// There is no account system yet, so the list lives in localStorage and is
// per browser. Storage can be missing or throw (private windows, blocked
// site data), so every read and write is guarded: the list still works for
// the current visit and `saveList` reports whether it could be kept.

export const SAVED_KEY = "handydad_saved_projects";

// Parse whatever is in storage into a clean list of unique string ids.
// Anything unexpected (bad JSON, wrong type) becomes an empty list.
export function parseSaved(raw) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id) => typeof id === "string" && id.length > 0))];
  } catch {
    return [];
  }
}

export function loadSaved(storage = globalThis.localStorage) {
  try {
    return parseSaved(storage?.getItem(SAVED_KEY));
  } catch {
    return [];
  }
}

// Returns true if the list was written, false if storage refused it.
export function saveList(ids, storage = globalThis.localStorage) {
  try {
    storage.setItem(SAVED_KEY, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}

export function isSaved(ids, id) {
  return ids.includes(id);
}

// Pure updates: never mutate the list passed in.
export function addSaved(ids, id) {
  return ids.includes(id) ? ids : [...ids, id];
}

export function removeSaved(ids, id) {
  return ids.filter((x) => x !== id);
}

// Saved ids that still exist in the library, in the order they were saved.
export function visibleSaved(ids, lookup) {
  return ids.map(lookup).filter(Boolean);
}
