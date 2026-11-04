import assert from "node:assert/strict";
import { test } from "node:test";

import { contentLength, currentMusic, MUSIC_TRACK_ID, setBackgroundMusic } from "./music.ts";
import { addItem } from "./ops.ts";
import { type Item, type Project, type Result } from "./types.ts";
import { emptyProject, parseProject } from "./validate.ts";

function must(result: Result<Project>): Project {
  assert.ok(result.ok, result.ok ? "" : result.error);
  return result.value;
}

const clip: Item = { kind: "video", id: "a", start: 0, duration: 10, src: "media/a", trimIn: 0, sourceDuration: 10, volume: 1 };
let counter = 0;
const id = (): string => `m${(counter += 1)}`;
const music = (project: Project): Item[] => project.tracks.find((t) => t.id === MUSIC_TRACK_ID)?.items ?? [];

test("music repeats under the whole video and the last play ends with it", () => {
  const project = must(setBackgroundMusic(must(addItem(emptyProject(), "video", clip)), { src: "lib:calm", seconds: 4, volume: 0.25 }, id));
  const plays = music(project);
  assert.deepEqual(plays.map((p) => [p.start, p.duration]), [[0, 4], [4, 4], [8, 2]]);
  assert.ok(parseProject(project).ok, "the project stays valid");
  assert.equal(currentMusic(project)?.volume, 0.25);
});

test("music never makes the video longer, and choosing again replaces it", () => {
  const withClip = must(addItem(emptyProject(), "video", clip));
  const first = must(setBackgroundMusic(withClip, { src: "lib:a", seconds: 30, volume: 0.25 }, id));
  assert.equal(contentLength(first), 10);
  assert.equal(music(first)[0]?.duration, 10);
  const second = must(setBackgroundMusic(first, { src: "lib:b", seconds: 30, volume: 0.5 }, id));
  assert.equal(music(second).length, 1);
  assert.equal(currentMusic(second)?.src, "lib:b");
});

test("taking the music out, or adding it to an empty video, leaves no music track", () => {
  const withMusic = must(setBackgroundMusic(must(addItem(emptyProject(), "video", clip)), { src: "lib:a", seconds: 5, volume: 0.25 }, id));
  assert.equal(must(setBackgroundMusic(withMusic, null, id)).tracks.some((t) => t.id === MUSIC_TRACK_ID), false);
  assert.equal(currentMusic(must(setBackgroundMusic(emptyProject(), { src: "lib:a", seconds: 5, volume: 0.25 }, id))), null);
});
