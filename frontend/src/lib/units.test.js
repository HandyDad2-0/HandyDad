import test from "node:test";
import assert from "node:assert/strict";
import { ftToCm, cmToFt, metersToCm, cmToMeters, toCm, fromCm, convert, formatLength } from "./units.js";

test("ftToCm and cmToFt round-trip", () => {
  assert.equal(ftToCm(1), 30.48);
  assert.equal(ftToCm(10), 304.8);
  assert.equal(Math.round(cmToFt(304.8) * 1000) / 1000, 10);
});

test("metersToCm and cmToMeters round-trip", () => {
  assert.equal(metersToCm(1), 100);
  assert.equal(metersToCm(2.5), 250);
  assert.equal(cmToMeters(250), 2.5);
});

test("toCm/fromCm dispatch on unit", () => {
  assert.equal(toCm(1, "ft"), 30.48);
  assert.equal(toCm(1, "m"), 100);
  assert.equal(fromCm(100, "m"), 1);
  assert.equal(Math.round(fromCm(30.48, "ft") * 1000) / 1000, 1);
});

test("convert goes through cm, feet <-> meters", () => {
  // 10 ft -> cm -> m, rounded, should be ~3.05 m
  assert.equal(Math.round(convert(10, "ft", "m") * 100) / 100, 3.05);
  // 1 m -> cm -> ft, rounded, should be ~3.28 ft
  assert.equal(Math.round(convert(1, "m", "ft") * 100) / 100, 3.28);
});

test("convert is a no-op when units match", () => {
  assert.equal(convert(5, "ft", "ft"), 5);
  assert.equal(convert(5, "m", "m"), 5);
});

test("formatLength rounds to the expected precision per unit", () => {
  assert.equal(formatLength(4.567, "ft"), "4.6 ft");
  assert.equal(formatLength(1.3729, "m"), "1.37 m");
  assert.equal(formatLength(4, "ft"), "4 ft");
});
