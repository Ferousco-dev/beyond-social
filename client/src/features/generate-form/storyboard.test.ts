import assert from "node:assert/strict";
import { test } from "node:test";

import { addShot, basisOf, clipsFromStoryboard, editShot, gap, groupShots, isReady, isStale, moveShot, removeShot, totalSeconds, voiceoverFit, voiceoverMatches, voiceoverOf, type Shot, type Storyboard } from "./storyboard.ts";

const shot = (id: string, seconds: number, visual = `Visual ${id}`, voiceover = ""): Shot => ({ id, seconds, visual, camera: "", voiceover, onScreenText: "" });
const plan = (...seconds: number[]): Storyboard => ({
  title: "t",
  look: "Woman in a grey jumper, bright office",
  shots: seconds.map((s, i) => shot(String(i), s, `Visual ${i}`, `Line ${i}.`)),
  basis: basisOf({ seconds: seconds.reduce((a, b) => a + b, 0), script: "script" }),
});

test("clips never pass 15 seconds, keep the order and lose no shot", () => {
  const shots = plan(5, 5, 5, 8, 8, 4, 4, 4, 3, 6).shots;
  const groups = groupShots(shots);
  assert.ok(groups.every((g) => totalSeconds(g) <= 15), groups.map((g) => totalSeconds(g)).join(","));
  assert.deepEqual(groups.flat().map((s) => s.id), shots.map((s) => s.id));
});

test("a three minute video of the longest shots still fits the clip limit", () => {
  const shots = Array.from({ length: 22 }, (_, i) => shot(String(i), 8)).slice(0, 22);
  const groups = groupShots(shots);
  assert.ok(groups.length <= 24);
  assert.ok(groups.every((g) => g.length === 1));
});

test("each clip prompt carries the shared look, its place and what is said", () => {
  const clips = clipsFromStoryboard(plan(5, 5, 5, 6, 6));
  assert.equal(clips.length, 2);
  assert.equal(clips[0]?.seconds, 15);
  assert.equal(clips[1]?.seconds, 12);
  for (const [index, clip] of clips.entries()) {
    assert.match(clip.prompt, new RegExp(`Part ${index + 1} of 2`));
    assert.match(clip.prompt, /grey jumper/);
  }
  assert.match(clips[0]?.prompt ?? "", /Shot 1 \(5s\): Visual 0 Said: "Line 0\."/);
});

test("a plan is ready only when it is exactly the chosen length and every shot shows something", () => {
  const p = plan(5, 5, 5);
  assert.equal(isReady(p, 15), true);
  assert.equal(isReady(p, 20), false);
  assert.equal(isReady(editShot(p, "0", { visual: "  " }), 15), false);
  assert.deepEqual(gap(p, 20), { kind: "short", by: 5 });
  assert.deepEqual(gap(p, 12), { kind: "over", by: 3 });
});

test("a shot length stays inside what the model can render", () => {
  const p = plan(5, 5, 5);
  assert.equal(editShot(p, "0", { seconds: 40 }).shots[0]?.seconds, 8);
  assert.equal(editShot(p, "0", { seconds: 0 }).shots[0]?.seconds, 3);
});

test("adding, removing and moving shots keeps the rest intact", () => {
  let p = plan(5, 5, 5);
  p = addShot(p, "0");
  assert.equal(p.shots.length, 4);
  assert.equal(p.shots[1]?.visual, "");
  p = removeShot(p, p.shots[1]?.id ?? "");
  assert.deepEqual(p.shots.map((s) => s.id), ["0", "1", "2"]);
  p = moveShot(p, "2", -1);
  assert.deepEqual(p.shots.map((s) => s.id), ["0", "2", "1"]);
  assert.equal(removeShot(plan(5), "0").shots.length, 1, "the last shot cannot be removed");
});

test("a plan goes stale when the length or the script changes, and not otherwise", () => {
  const p = plan(5, 5, 5);
  assert.equal(isStale(p, { seconds: 15, script: "script" }), false);
  assert.equal(isStale(p, { seconds: 30, script: "script" }), true);
  assert.equal(isStale(p, { seconds: 15, script: "a different script" }), true);
  assert.equal(isStale(null, { seconds: 15, script: "x" }), false);
});

test("the voiceover reads straight through, in order, skipping silent shots", () => {
  const p: Storyboard = { ...plan(5, 5, 5), shots: [shot("a", 5, "v", "First."), shot("b", 5, "v", ""), shot("c", 5, "v", "Third.")] };
  assert.equal(voiceoverOf(p), "First. Third.");
});

test("a recording longer than the video must be fixed, a much shorter one only warns", () => {
  assert.equal(voiceoverFit(45, 45, 112).kind, "fits");
  assert.equal(voiceoverFit(46, 45, 115).kind, "fits", "a second over is within tolerance");
  const long = voiceoverFit(52, 45, 130);
  assert.equal(long.kind, "long");
  assert.equal(long.seconds, 7);
  assert.ok(long.words >= 17 && long.words <= 19, `words to cut: ${long.words}`);
  assert.equal(voiceoverFit(30, 45, 75).kind, "short");
  assert.equal(voiceoverFit(40, 45, 100).kind, "fits", "five seconds under a 45s video is not worth a warning");
});

test("a voiceover belongs to the words it was made from", () => {
  const p = plan(5, 5, 5);
  const made = { mediaId: "m", seconds: 14, text: voiceoverOf(p) };
  assert.equal(voiceoverMatches(p, made), true);
  assert.equal(voiceoverMatches(editShot(p, "0", { voiceover: "Changed words." }), made), false);
  assert.equal(voiceoverMatches(p, null), false);
  assert.equal(voiceoverMatches(null, made), false);
});

test("narrated clips are silent footage: nobody is told to speak", () => {
  const spoken = clipsFromStoryboard(plan(5, 5, 5));
  assert.match(spoken[0]?.prompt ?? "", /Said: "Line 0\."/);
  const narrated = clipsFromStoryboard(plan(5, 5, 5), "", true);
  assert.doesNotMatch(narrated[0]?.prompt ?? "", /Said:/);
  assert.match(narrated[0]?.prompt ?? "", /Silent footage/);
  assert.match(narrated[0]?.prompt ?? "", /Shot 1 \(5s\): Visual 0/);
});
