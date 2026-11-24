import assert from "node:assert/strict";
import { test } from "node:test";

import { suggestTimes, suggestionLabel, wallTimeToInstant } from "./best-times.ts";

test("a wall-clock time in a zone becomes the right instant", () => {
  // 19:00 in Lagos (UTC+1) is 18:00 UTC; in Singapore (UTC+8) it is 11:00 UTC.
  assert.equal(wallTimeToInstant(2026, 11, 25, 19, "Africa/Lagos").toISOString(), "2026-11-25T18:00:00.000Z");
  assert.equal(wallTimeToInstant(2026, 11, 25, 19, "Asia/Singapore").toISOString(), "2026-11-25T11:00:00.000Z");
});

test("general suggestions are the platform's busy hours, ahead of now, in the audience's zone", () => {
  // Wednesday 25 Nov 2026, 13:00 in Lagos.
  const now = new Date("2026-11-25T12:00:00Z");
  const got = suggestTimes(["tiktok"], "Africa/Lagos", now);
  assert.equal(got.length, 3);
  assert.deepEqual(
    got.map((s) => s.local),
    ["2026-11-25T19:00", "2026-11-25T21:00", "2026-11-26T12:00"],
  );
  assert.ok(got.every((s) => s.source === "general" && s.at.getTime() > now.getTime()));
  assert.equal(suggestionLabel(got[0]!, "Africa/Lagos", now), "Today 7 pm");
  assert.equal(suggestionLabel(got[2]!, "Africa/Lagos", now), "Tomorrow 12 pm");
});

test("an account's own best slots come first when it has them", () => {
  const now = new Date("2026-11-25T12:00:00Z"); // a Wednesday
  // Thursday 17:00 UTC is 18:00 in Lagos.
  const got = suggestTimes(["tiktok"], "Africa/Lagos", now, [{ weekday: 4, hour: 17 }]);
  assert.equal(got.length, 1);
  assert.equal(got[0]!.source, "history");
  assert.equal(got[0]!.local, "2026-11-26T18:00");
});
