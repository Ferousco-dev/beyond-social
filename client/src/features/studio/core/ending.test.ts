import assert from "node:assert/strict";
import { test } from "node:test";

import { currentEnding, ENDING_SECONDS, endingStart, setEnding } from "./ending.ts";
import { currentMusic, MUSIC_TRACK_ID, setBackgroundMusic } from "./music.ts";
import { addItem } from "./ops.ts";
import { type Item, type Project, type Result } from "./types.ts";
import { emptyProject, parseProject } from "./validate.ts";

function must(result: Result<Project>): Project {
  assert.ok(result.ok, result.ok ? "" : result.error);
  return result.value;
}

const clip: Item = { kind: "video", id: "a", start: 0, duration: 8, src: "media/a", trimIn: 0, sourceDuration: 8, volume: 1 };
let counter = 0;
const id = (): string => `e${(counter += 1)}`;
const withClip = (): Project => must(addItem(emptyProject(), "video", clip));

test("the ending follows the last clip, with its detail line beneath", () => {
  const project = must(setEnding(withClip(), { headline: "Follow for more", detail: "@beyondsocial" }, id));
  assert.equal(endingStart(project), 8);
  assert.deepEqual(currentEnding(project), { headline: "Follow for more", detail: "@beyondsocial" });
  assert.ok(parseProject(project).ok, "the project stays valid");
});

test("setting the ending again replaces it, and null removes it", () => {
  const first = must(setEnding(withClip(), { headline: "Shop now", detail: "" }, id));
  const second = must(setEnding(first, { headline: "Book a call", detail: "" }, id));
  assert.equal(second.tracks.flatMap((t) => t.items).filter((i) => i.id.startsWith("ending:")).length, 1);
  assert.equal(currentEnding(second)?.headline, "Book a call");
  assert.equal(currentEnding(must(setEnding(second, null, id))), null);
});

test("music is refitted to play under the ending too", () => {
  const withMusic = must(setBackgroundMusic(withClip(), { src: "lib:a", seconds: 20, volume: 0.25 }, id));
  const ended = must(setEnding(withMusic, { headline: "Contact me", detail: "" }, id));
  const music = ended.tracks.find((t) => t.id === MUSIC_TRACK_ID)?.items ?? [];
  assert.equal(music.reduce((sum, item) => sum + item.duration, 0), 8 + ENDING_SECONDS);
  assert.equal(currentMusic(ended)?.volume, 0.25);
});

test("an ending needs a video before it", () => {
  assert.ok(!setEnding(emptyProject(), { headline: "Follow", detail: "" }, id).ok);
});
