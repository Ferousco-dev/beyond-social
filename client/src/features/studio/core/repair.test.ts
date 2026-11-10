import assert from "node:assert/strict";
import test from "node:test";

import { repairProject } from "./repair.ts";
import { emptyProject, parseProject } from "./validate.ts";

const video = (id: string, start: number, duration: number, extra: Record<string, unknown> = {}) => ({
  kind: "video", id, start, duration, src: "media:x", trimIn: 0, sourceDuration: 60, volume: 1, ...extra,
});

function broken() {
  const project = emptyProject();
  return {
    ...project,
    tracks: project.tracks.map((track) => {
      if (track.kind === "video") {
        return {
          ...track,
          items: [
            video("a", 0, 4),
            video("b", 2, 4), // overlaps a
            video("a", 10, 2), // repeats an id
            video("c", 20, 3, { volume: 9 }), // not a valid item
          ],
        };
      }
      if (track.kind === "audio") return { ...track, items: [video("d", 0, 3)] }; // a video on an audio track
      return track;
    }),
  };
}

test("the strict check refuses the broken project", () => {
  assert.equal(parseProject(broken()).ok, false);
});

test("repair keeps what it can and says what changed", () => {
  const fixed = repairProject(broken());
  assert.ok(fixed);
  assert.equal(parseProject(fixed.project).ok, true);
  const items = fixed.project.tracks.find((t) => t.kind === "video")!.items;
  assert.deepEqual(items.map((i) => [i.id, i.start]), [["a", 0], ["b", 4]]); // b slid to follow a
  assert.equal(fixed.project.tracks.find((t) => t.kind === "audio")!.items.length, 0);
  assert.ok(fixed.problems.length >= 4);
});

test("a clean project needs no changes", () => {
  const fixed = repairProject(emptyProject());
  assert.ok(fixed);
  assert.deepEqual(fixed.problems, []);
});

test("a missing timeline and bad size become a usable empty project", () => {
  const fixed = repairProject({ version: 1, width: "big", fps: 0 });
  assert.ok(fixed);
  assert.equal(parseProject(fixed.project).ok, true);
  assert.equal(fixed.project.width, 1080);
});

test("something that is not a project cannot be repaired", () => {
  assert.equal(repairProject("nope"), null);
  assert.equal(repairProject(null), null);
});
