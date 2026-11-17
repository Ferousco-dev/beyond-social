import assert from "node:assert/strict";
import { test } from "node:test";

import { partCount, partSeconds, planLongVideo, shareOut } from "./long-video.ts";

test("a long video is cut into clips of at most 15 seconds that add up to the total", () => {
  for (const total of [16, 30, 45, 60, 90, 120, 179, 180]) {
    const parts = partSeconds(total);
    assert.equal(parts.length, partCount(total));
    assert.equal(parts.reduce((a, b) => a + b, 0), total);
    assert.ok(parts.every((seconds) => seconds >= 5 && seconds <= 15), `${total}: ${parts.join(",")}`);
  }
});

test("nothing longer than three minutes is planned", () => {
  assert.equal(partSeconds(999).reduce((a, b) => a + b, 0), 180);
  assert.equal(partCount(999), 12);
});

test("sentences are shared out in order, none split", () => {
  const story = "One is first. Two is second. Three is third. Four is fourth. Five is fifth. Six is sixth.";
  const shares = shareOut(story, 3);
  assert.equal(shares.length, 3);
  assert.equal(shares.join(" "), story);
  assert.ok(shares.every((share) => share.endsWith(".")));
});

test("with no script every clip still gets its own place in the story", () => {
  const plan = planLongVideo({ setting: "A kitchen, morning light.", story: "", totalSeconds: 45 });
  assert.equal(plan.length, 3);
  assert.match(plan[0]?.prompt ?? "", /the opening/);
  assert.match(plan[1]?.prompt ?? "", /the middle/);
  assert.match(plan[2]?.prompt ?? "", /the closing/);
  assert.ok(plan.every((part) => part.prompt.includes("A kitchen, morning light.")));
});

test("every clip prompt stays inside the generator's limit", () => {
  const story = Array.from({ length: 400 }, (_, i) => `Sentence number ${i} says something useful.`).join(" ");
  const plan = planLongVideo({ setting: "x".repeat(600), story, totalSeconds: 180 });
  assert.equal(plan.length, 12);
  assert.ok(plan.every((part) => Array.from(part.prompt).length <= 2300));
});
