import assert from "node:assert/strict";
import test from "node:test";

import { captionsFromWords } from "./captions.ts";
import { commit, createHistory, replacePresent, undo } from "./history.ts";
import { addItem, splitItem } from "./ops.ts";
import { emptyProject } from "./validate.ts";
import type { Item } from "./types.ts";

type Video = Extract<Item, { kind: "video" }>;
const clip = (extra: Partial<Video> = {}): Video => ({ kind: "video", id: "a", start: 0, duration: 6, src: "media:x", trimIn: 0, sourceDuration: 20, volume: 1, ...extra });

test("splitting a clip gives the entrance to the first half only", () => {
  const added = addItem(emptyProject(), "video", clip({ transition: { type: "fade", duration: 1 } }));
  assert.ok(added.ok);
  const cut = splitItem(added.value, "a", 3, "b");
  assert.ok(cut.ok);
  const [head, tail] = cut.value.tracks.find((t) => t.kind === "video")!.items as Video[];
  assert.equal(head!.transition?.type, "fade");
  assert.equal(tail!.transition, undefined);
});

test("captions follow a clip that plays faster than normal", () => {
  // 5 seconds at 2x plays 10 seconds of the source, so source time 6 is timeline time 3.
  const words = [{ text: "hello", start: 6, end: 6.5 }, { text: "world", start: 8, end: 8.5 }];
  const found = captionsFromWords(words, clip({ duration: 5, speed: 2 }), () => "c");
  assert.equal(found.length > 0, true);
  assert.equal(found[0]!.start, 3);
  assert.ok(found.every((c) => c.start + c.duration <= 5 + 0.5));
});

test("captions follow a clip that plays slower than normal", () => {
  // 8 seconds at half speed plays 4 seconds of source; a word at source 2 is at timeline 4 (+ clip start 1).
  const found = captionsFromWords([{ text: "slow", start: 2, end: 2.5 }], clip({ start: 1, duration: 8, speed: 0.5 }), () => "c");
  assert.equal(found[0]!.start, 5);
});

test("captions on a normal-speed clip are unchanged", () => {
  const found = captionsFromWords([{ text: "hi", start: 1, end: 1.4 }], clip({ start: 2, trimIn: 0.5 }), () => "c");
  assert.equal(found[0]!.start, 2.5);
});

test("a merged edit does not keep a redo that no longer follows from it", () => {
  let history = commit(createHistory(1), 2);
  history = undo(history);
  assert.deepEqual(history.future, [2]);
  const merged = replacePresent(history, 99);
  assert.equal(merged.present, 99);
  assert.deepEqual(merged.future, []);
});
