import assert from "node:assert/strict";
import { test } from "node:test";

import { isTrackCompleted, markTrackCompleted, parseProgress, resetTrack, TUTORIAL_TRACKS } from "./steps.ts";

test("parses empty, invalid, and valid tutorial progress safely", () => {
  assert.deepEqual(parseProgress(null), { completed: [] });
  assert.deepEqual(parseProgress("{broken"), { completed: [] });
  assert.deepEqual(parseProgress(JSON.stringify({ completed: ["dashboard", "unknown", "dashboard"] })), {
    completed: ["dashboard"],
  });
});

test("marks and resets completed tracks without duplicates", () => {
  let state = parseProgress(null);
  assert.equal(isTrackCompleted(state, "editor"), false);
  state = markTrackCompleted(state, "editor");
  state = markTrackCompleted(state, "editor");
  assert.deepEqual(state.completed, ["editor"]);
  assert.equal(isTrackCompleted(state, "editor"), true);
  state = resetTrack(state, "editor");
  assert.equal(isTrackCompleted(state, "editor"), false);
});

test("every tutorial track has steps with non-empty anchors and copy", () => {
  for (const steps of Object.values(TUTORIAL_TRACKS)) {
    assert.ok(steps.length >= 3);
    for (const step of steps) {
      assert.ok(step.anchor.trim().length > 0);
      assert.ok(step.title.trim().length > 0);
      assert.ok(step.body.trim().length > 0);
    }
  }
});
