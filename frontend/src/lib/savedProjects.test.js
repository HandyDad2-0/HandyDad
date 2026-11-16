import test from "node:test";
import assert from "node:assert/strict";
import {
  SAVED_KEY,
  parseSaved,
  loadSaved,
  saveList,
  isSaved,
  addSaved,
  removeSaved,
  visibleSaved,
} from "./savedProjects.js";

const fakeStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
};

test("parseSaved keeps unique non-empty string ids in order", () => {
  assert.deepEqual(parseSaved('["a","b","a","","c"]'), ["a", "b", "c"]);
});

test("parseSaved turns anything unexpected into an empty list", () => {
  assert.deepEqual(parseSaved(null), []);
  assert.deepEqual(parseSaved(""), []);
  assert.deepEqual(parseSaved("not json"), []);
  assert.deepEqual(parseSaved('{"a":1}'), []);
  assert.deepEqual(parseSaved("42"), []);
  assert.deepEqual(parseSaved('[1,null,{"x":1},"ok"]'), ["ok"]);
});

test("a saved list survives a 'reload' (write, then load from the same storage)", () => {
  const storage = fakeStorage();
  assert.equal(saveList(["sandbox", "bench"], storage), true);
  assert.equal(storage.data[SAVED_KEY], '["sandbox","bench"]');
  assert.deepEqual(loadSaved(storage), ["sandbox", "bench"]);
});

test("loadSaved and saveList survive storage that is missing or throws", () => {
  const throwing = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("quota"); },
  };
  assert.deepEqual(loadSaved(throwing), []);
  assert.equal(saveList(["a"], throwing), false);
  assert.deepEqual(loadSaved(undefined), []);
  assert.equal(saveList(["a"], undefined), false);
});

test("addSaved adds once and never mutates the original", () => {
  const start = ["a"];
  const next = addSaved(start, "b");
  assert.deepEqual(next, ["a", "b"]);
  assert.deepEqual(start, ["a"]);
  assert.equal(addSaved(next, "b"), next);
});

test("removeSaved removes only that id and never mutates the original", () => {
  const start = ["a", "b", "c"];
  assert.deepEqual(removeSaved(start, "b"), ["a", "c"]);
  assert.deepEqual(start, ["a", "b", "c"]);
  assert.deepEqual(removeSaved(start, "zzz"), ["a", "b", "c"]);
});

test("isSaved", () => {
  assert.equal(isSaved(["a"], "a"), true);
  assert.equal(isSaved(["a"], "b"), false);
});

test("visibleSaved skips ids no longer in the library and keeps save order", () => {
  const lib = { a: { id: "a" }, c: { id: "c" } };
  assert.deepEqual(visibleSaved(["c", "gone", "a"], (id) => lib[id] ?? null).map((p) => p.id), ["c", "a"]);
});
