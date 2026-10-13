import assert from "node:assert/strict";
import { test } from "node:test";

import { detectZone, isValidZone, zonedTimeToUtc } from "./zone.ts";

test("6pm in Lagos is 5pm UTC", () => {
  assert.equal(zonedTimeToUtc("2026-10-14T18:00", "Africa/Lagos")?.toISOString(), "2026-10-14T17:00:00.000Z");
});

test("the same wall clock means different instants in different zones", () => {
  assert.equal(zonedTimeToUtc("2026-10-14T18:00", "Asia/Singapore")?.toISOString(), "2026-10-14T10:00:00.000Z");
  assert.equal(zonedTimeToUtc("2026-10-14T18:00", "Asia/Qatar")?.toISOString(), "2026-10-14T15:00:00.000Z");
  assert.equal(zonedTimeToUtc("2026-10-14T18:00", "Asia/Jakarta")?.toISOString(), "2026-10-14T11:00:00.000Z");
});

test("daylight saving is applied for the date asked, not today", () => {
  assert.equal(zonedTimeToUtc("2026-07-01T09:00", "America/New_York")?.toISOString(), "2026-07-01T13:00:00.000Z");
  assert.equal(zonedTimeToUtc("2026-12-01T09:00", "America/New_York")?.toISOString(), "2026-12-01T14:00:00.000Z");
});

test("a half-hour zone is exact", () => {
  assert.equal(zonedTimeToUtc("2026-10-14T18:00", "Asia/Kolkata")?.toISOString(), "2026-10-14T12:30:00.000Z");
});

test("bad input is refused, not guessed", () => {
  assert.equal(zonedTimeToUtc("tomorrow", "Africa/Lagos"), null);
  assert.equal(zonedTimeToUtc("2026-10-14T18:00", "Mars/Olympus"), null);
  assert.equal(isValidZone("Africa/Lagos"), true);
  assert.equal(isValidZone(""), false);
  assert.ok(isValidZone(detectZone()));
});
