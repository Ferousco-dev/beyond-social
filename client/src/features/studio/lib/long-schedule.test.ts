import assert from "node:assert/strict";
import { test } from "node:test";

import type { LongPart } from "../core/types.ts";
import { allReady, partsToStart, stalled } from "./long-schedule.ts";

const part = (state: LongPart["state"], extra: Partial<LongPart> = {}): LongPart => ({ key: "00000000-0000-4000-8000-000000000000", prompt: "x", seconds: 10, state, ...extra });

test("at most three clips render at once, started in order", () => {
  const parts = [part("pending"), part("pending"), part("pending"), part("pending"), part("pending")];
  assert.deepEqual(partsToStart(parts), [0, 1, 2]);
});

test("a finished clip frees a slot for the next one", () => {
  const parts = [part("completed", { mediaId: "m" }), part("running"), part("running"), part("pending"), part("pending")];
  assert.deepEqual(partsToStart(parts), [3]);
});

test("clips rendering elsewhere count against the same limit", () => {
  assert.deepEqual(partsToStart([part("pending"), part("pending")], 2), [0]);
  assert.deepEqual(partsToStart([part("pending")], 3), []);
});

test("the video is joined only when every clip is in", () => {
  assert.equal(allReady([part("completed", { mediaId: "a" }), part("running")]), false);
  assert.equal(allReady([part("completed", { mediaId: "a" }), part("completed", { mediaId: "b" })]), true);
  assert.equal(allReady([]), false);
});

test("a failed clip with nothing else moving is a stall the person must fix", () => {
  assert.equal(stalled([part("failed"), part("completed", { mediaId: "a" })]), true);
  assert.equal(stalled([part("failed"), part("pending")]), false);
  assert.equal(stalled([part("completed", { mediaId: "a" })]), false);
});
