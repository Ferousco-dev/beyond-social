import assert from "node:assert/strict";
import test from "node:test";

import { fitToFootage } from "./footage.ts";
import { emptyProject } from "./validate.ts";
import type { Item, Project } from "./types.ts";

type Video = Extract<Item, { kind: "video" }>;

function avatarProject(): Project {
  const base = emptyProject();
  const avatar: Video = { kind: "video", id: "avatar", src: "media:avatar", start: 0, duration: 15 / 1.29, speed: 1.29, trimIn: 0, sourceDuration: 15, volume: 1 };
  const next: Video = { kind: "video", id: "next", src: "media:next", start: 15 / 1.29 + 0.03, duration: 9.87, trimIn: 0, sourceDuration: 9.87, volume: 1 };
  return {
    ...base,
    assets: [{ src: "media:avatar", name: "Avatar video", kind: "video", duration: 15 }],
    tracks: base.tracks.map((track) => (track.kind === "video" ? { ...track, items: [avatar, next] } : track)),
  };
}

const videos = (project: Project): Video[] => project.tracks.find((t) => t.kind === "video")!.items as Video[];

test("a generated video shorter than asked for stops showing a frozen gap", () => {
  const fitted = fitToFootage(avatarProject(), "media:avatar", 8.04);
  const [avatar, next] = videos(fitted);
  assert.equal(avatar!.sourceDuration, 8.04);
  assert.ok(Math.abs(avatar!.duration - 8.04 / 1.29) < 1e-9);
  assert.ok(Math.abs(next!.start - (8.04 / 1.29 + 0.03)) < 1e-9, "the next clip closes up the gap");
  assert.equal(fitted.assets?.[0]?.duration, 8.04);
});

test("a file as long as the project says changes nothing", () => {
  const project = avatarProject();
  assert.equal(fitToFootage(project, "media:avatar", 15.02), project);
  assert.equal(fitToFootage(project, "media:avatar", Number.NaN), project);
});
