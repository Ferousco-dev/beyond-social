import assert from "node:assert/strict";
import { test } from "node:test";

import { animatedAt, entranceAt } from "./animate.ts";
import { projectDuration } from "./find.ts";
import { commit, createHistory, redo, undo } from "./history.ts";
import { addItem, deleteItem, moveItem, removeKeyframe, replaceCaptions, restyleCaptions, setKeyframe, setSpeed, setTransition, splitAll, splitItem, trimItem, updateItem } from "./ops.ts";
import { type Item, type Project, type Result } from "./types.ts";
import { emptyProject, parseProject } from "./validate.ts";

const clip = (id: string, start: number, duration: number, trimIn = 0, kind: "video" | "audio" = "video"): Item => ({
  kind,
  id,
  start,
  duration,
  src: `media/${id}`,
  trimIn,
  sourceDuration: 10,
  volume: 1,
});

function must(result: Result<Project>): Project {
  assert.ok(result.ok, result.ok ? "" : result.error);
  return result.value;
}

const withClip = (): Project => must(addItem(emptyProject(), "video", clip("a", 0, 6)));
const items = (project: Project, track = "video"): Item[] => project.tracks.find((t) => t.id === track)?.items ?? [];

test("a clip lands on a track that holds its kind, and not on another", () => {
  assert.equal(items(withClip()).length, 1);
  const wrong = addItem(emptyProject(), "audio", clip("a", 0, 5));
  assert.ok(!wrong.ok);
});

test("clips on one track cannot overlap, but may touch", () => {
  const project = withClip();
  assert.ok(!addItem(project, "video", clip("b", 5, 3)).ok);
  assert.ok(addItem(project, "video", clip("b", 6, 3)).ok);
});

test("splitting keeps the footage continuous across the cut", () => {
  const project = must(splitItem(withClip(), "a", 2.5, "b"));
  const [first, second] = items(project);
  assert.ok(first && second && first.kind === "video" && second.kind === "video");
  assert.equal(first.duration, 2.5);
  assert.equal(second.start, 2.5);
  assert.equal(second.duration, 3.5);
  assert.equal(second.trimIn, 2.5);
  assert.equal(projectDuration(project), 6);
});

test("a cut at the very edge or outside is refused", () => {
  assert.ok(!splitItem(withClip(), "a", 0.05, "b").ok);
  assert.ok(!splitItem(withClip(), "a", 6, "b").ok);
  assert.ok(!splitItem(withClip(), "a", 9, "b").ok);
});

test("trimming the start moves the source offset with it", () => {
  const item = items(must(trimItem(withClip(), "a", "start", 2)))[0];
  assert.ok(item && item.kind === "video");
  assert.equal(item.start, 2);
  assert.equal(item.duration, 4);
  assert.equal(item.trimIn, 2);
});

test("an end cannot be dragged past the footage that exists", () => {
  assert.ok(!trimItem(withClip(), "a", "end", 11).ok);
  assert.ok(trimItem(withClip(), "a", "end", 10).ok);
  assert.ok(!trimItem(withClip(), "a", "end", 0.05).ok);
});

test("a start cannot be dragged before the footage begins", () => {
  const later = must(addItem(emptyProject(), "video", clip("a", 3, 4)));
  assert.ok(!trimItem(later, "a", "start", 2).ok);
  const trimmed = must(trimItem(withClip(), "a", "start", 2));
  assert.ok(trimItem(trimmed, "a", "start", 1).ok);
});

test("trimming cannot run into the next clip", () => {
  const project = must(addItem(withClip(), "video", clip("b", 7, 2)));
  assert.ok(!trimItem(project, "a", "end", 8).ok);
});

test("moving respects neighbours and the start of the timeline", () => {
  const project = must(addItem(withClip(), "video", clip("b", 8, 2)));
  assert.ok(!moveItem(project, "a", 5).ok);
  assert.ok(!moveItem(project, "a", -1).ok);
  assert.ok(moveItem(project, "b", 6).ok);
});

test("a plain delete leaves a gap and a ripple delete closes it", () => {
  const project = must(addItem(withClip(), "video", clip("b", 6, 2)));
  assert.equal(items(must(deleteItem(project, "a")))[0]?.start, 6);
  assert.equal(items(must(deleteItem(project, "a", true)))[0]?.start, 0);
});

test("captions are not split", () => {
  const caption: Item = { kind: "caption", id: "c", start: 0, duration: 3, text: "hi", style: { color: "#ffffff", size: 48, y: 0.8 } };
  const project = must(addItem(emptyProject(), "captions", caption));
  assert.ok(!splitItem(project, "c", 1.5, "d").ok);
});

test("edits never change the project they started from", () => {
  const before = withClip();
  const snapshot = JSON.stringify(before);
  splitItem(before, "a", 3, "b");
  trimItem(before, "a", "end", 4);
  deleteItem(before, "a");
  assert.equal(JSON.stringify(before), snapshot);
});

test("history undoes, redoes and drops the future after a new edit", () => {
  const first = withClip();
  const second = must(splitItem(first, "a", 3, "b"));
  let history = commit(createHistory(first), second);
  history = undo(history);
  assert.equal(history.present, first);
  history = redo(history);
  assert.equal(history.present, second);
  history = commit(undo(history), must(deleteItem(first, "a")));
  assert.equal(history.future.length, 0);
  assert.equal(undo(createHistory(first)).present, first);
});

test("a stored project is checked for shape and for rules the shape cannot say", () => {
  assert.ok(parseProject(JSON.parse(JSON.stringify(withClip()))).ok);
  assert.ok(!parseProject({ version: 2 }).ok);
  const overlapping = withClip();
  overlapping.tracks.find((t) => t.id === "video")?.items.push(clip("b", 3, 2));
  assert.ok(!parseProject(overlapping).ok);
  const misplaced = emptyProject();
  misplaced.tracks.find((t) => t.id === "audio")?.items.push(clip("a", 0, 2));
  assert.ok(!parseProject(misplaced).ok);
  const duplicate = withClip();
  duplicate.tracks.find((t) => t.id === "audio")?.items.push(clip("a", 0, 2, 0, "audio"));
  assert.ok(!parseProject(duplicate).ok);
});

test("a saved generation stays attached to its editor project", () => {
  const generation = {
    jobId: "d2719b5c-9b2a-4f41-9f9c-6d09a8ed92fb",
    script: "A short product introduction",
    state: "running" as const,
  };
  const parsed = parseProject(emptyProject(generation));
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.value.generation, generation);
  assert.ok(!parseProject({ ...emptyProject(), generation: { ...generation, jobId: "bad" } }).ok);
});

test("an item's settings change, but only to valid values and never its timing", () => {
  const project = withClip();
  const louder = items(must(updateItem(project, "a", { volume: 0.5 })))[0];
  assert.ok(louder && louder.kind === "video" && louder.volume === 0.5);
  assert.ok(!updateItem(project, "a", { volume: 9 }).ok);
  assert.ok(!updateItem(project, "a", { start: 3 }).ok);
  assert.ok(!updateItem(project, "missing", { volume: 1 }).ok);
});

import { applyOperations, type Operation } from "./assist.ts";
import { captionsFromWords } from "./captions.ts";
import { describeProject } from "./describe.ts";

const op = (patch: Partial<Operation>): Operation => ({
  op: "seek", item_id: "", text: "", at: 0, start: 0, duration: 0, edge: "", volume: 0, color: "", size: 0, y: 0, speed: 0, ...patch,
});
let counter = 0;
const nextId = (): string => `n${++counter}`;

test("captions follow the part of the source the clip plays, moved onto the timeline", () => {
  const source = clip("a", 10, 4, 2) as Extract<Item, { kind: "video" }>; // plays source 2s to 6s, at timeline 10s
  const words = [
    { text: "before", start: 0.5, end: 1.5 },
    { text: "Hello", start: 2.5, end: 3.0 },
    { text: "world.", start: 3.1, end: 3.6 },
    { text: "Next", start: 4.5, end: 5.0 },
    { text: "after", start: 7, end: 7.5 },
  ];
  const captions = captionsFromWords(words, source, nextId);
  assert.deepEqual(captions.map((c) => c.text), ["Hello world.", "Next"]);
  assert.equal(captions[0]?.start, 10.5);
  assert.ok(Math.abs((captions[0]?.words?.[1]?.start ?? 0) - 0.6) < 1e-9);
  assert.ok(captions.every((c) => c.start >= 10 && c.start + c.duration <= 14.6));
});

test("a long run of speech breaks into short captions", () => {
  const source = clip("a", 0, 10) as Extract<Item, { kind: "video" }>;
  const words = Array.from({ length: 20 }, (_, i) => ({ text: `w${i}`, start: i * 0.3, end: i * 0.3 + 0.25 }));
  const captions = captionsFromWords(words, source, nextId);
  assert.ok(captions.length >= 3);
  assert.ok(captions.every((c) => (c.words?.length ?? 0) <= 6));
});

test("the assistant's operations apply together, skipping only the ones that cannot", () => {
  const project = withClip();
  const result = applyOperations(
    project,
    [op({ op: "split_item", item_id: "a", at: 3 }), op({ op: "delete_item", item_id: "ghost" }), op({ op: "seek", at: 4 }), op({ op: "add_text", text: "Hi", start: 1, duration: 2 })],
    nextId,
  );
  assert.equal(result.applied, 3);
  assert.equal(result.failures.length, 1);
  assert.equal(result.seek, 4);
  assert.equal(items(result.project).length, 2);
  assert.equal(items(result.project, "text").length, 1);
  assert.equal(items(project).length, 1);
});

test("a caption style change keeps what it is not given", () => {
  const caption: Item = { kind: "caption", id: "c", start: 0, duration: 3, text: "hi", style: { color: "#ffffff", size: 48, y: 0.8 } };
  const project = must(addItem(emptyProject(), "captions", caption));
  const changed = applyOperations(project, [op({ op: "set_caption_style", item_id: "c", color: "#ff0000" })], nextId);
  const item = items(changed.project, "captions")[0];
  assert.ok(item && item.kind === "caption");
  assert.equal(item.style.color, "#ff0000");
  assert.equal(item.style.size, 48);
});

test("the project description carries ids and stays short", () => {
  const text = describeProject(withClip(), 1.234);
  const parsed = JSON.parse(text) as { playhead: number; items: { id: string }[] };
  assert.equal(parsed.playhead, 1.23);
  assert.equal(parsed.items[0]?.id, "a");
});

test("regenerating captions replaces the old ones in that stretch and leaves the rest", () => {
  const cap = (id: string, start: number): Item => ({ kind: "caption", id, start, duration: 1, text: id, style: { color: "#ffffff", size: 48, y: 0.8 } });
  let project = must(addItem(emptyProject(), "captions", cap("old1", 1)));
  project = must(addItem(project, "captions", cap("keep", 20)));
  const next = must(replaceCaptions(project, 0, 10, [cap("new1", 2), cap("new2", 4)]));
  assert.deepEqual(items(next, "captions").map((i) => i.id), ["new1", "new2", "keep"]);
});

test("restyling changes every caption's look and nothing else", () => {
  const cap = (id: string, start: number): Item => ({ kind: "caption", id, start, duration: 1, text: id, style: { color: "#ffffff", size: 48, y: 0.8 } });
  let project = must(addItem(emptyProject(), "captions", cap("a", 0)));
  project = must(addItem(project, "captions", cap("b", 2)));
  const next = must(restyleCaptions(project, { preset: "pill", highlight: "#00ff00" }));
  for (const item of items(next, "captions")) {
    assert.ok(item.kind === "caption" && item.style.preset === "pill" && item.style.highlight === "#00ff00" && item.style.size === 48);
  }
  assert.ok(!restyleCaptions(project, { color: "red" }).ok);
});

test("a project saved before text tracks existed gains one", () => {
  const old = JSON.parse(JSON.stringify(emptyProject())) as Project;
  old.tracks = old.tracks.filter((t) => t.kind !== "text");
  const parsed = parseProject(old);
  assert.ok(parsed.ok && parsed.value.tracks.some((t) => t.kind === "text"));
});

test("text items split like clips and keep their words", () => {
  const text: Item = { kind: "text", id: "t", start: 0, duration: 4, text: "Hi", style: { color: "#ffffff", size: 48, y: 0.5 } };
  const project = must(addItem(emptyProject(), "text", text));
  const split = must(splitItem(project, "t", 1, "u"));
  assert.deepEqual(items(split, "text").map((i) => [i.id, i.duration]), [["t", 1], ["u", 3]]);
});

test("split all cuts every layer under the playhead and nothing else", () => {
  const audio = clip("s", 0, 6, 0, "audio");
  let project = must(addItem(withClip(), "audio", audio));
  const cap: Item = { kind: "caption", id: "c", start: 0, duration: 6, text: "x", style: { color: "#ffffff", size: 48, y: 0.8 } };
  project = must(addItem(project, "captions", cap));
  let n = 0;
  const next = must(splitAll(project, 3, () => `x${++n}`));
  assert.equal(items(next, "video").length, 2);
  assert.equal(items(next, "audio").length, 2);
  assert.equal(items(next, "captions").length, 1);
  assert.ok(!splitAll(project, 99, () => "z").ok);
});

const first = (project: Project, track = "video"): Extract<Item, { kind: "video" }> => {
  const item = items(project, track)[0];
  assert.ok(item && item.kind === "video");
  return item;
};

test("faster playback makes a clip shorter and covers the same footage", () => {
  const fast = first(must(setSpeed(withClip(), "a", 2)));
  assert.equal(fast.duration, 3);
  assert.equal(fast.speed, 2);
  assert.equal(first(must(setSpeed(withClip(), "a", 0.5))).duration, 12);
  assert.ok(!setSpeed(withClip(), "a", 5).ok);
});

test("a speed change cannot run into the next clip", () => {
  const project = must(addItem(withClip(), "video", clip("b", 7, 2)));
  assert.ok(!setSpeed(project, "a", 0.5).ok);
  assert.ok(setSpeed(project, "a", 2).ok);
});

test("cuts and trims count source seconds at the clip's speed", () => {
  const fast = must(setSpeed(withClip(), "a", 2)); // plays source 0-6 in 3s
  const cut = must(splitItem(fast, "a", 1, "b"));
  const tail = items(cut)[1];
  assert.ok(tail && tail.kind === "video");
  assert.equal(tail.trimIn, 2);
  assert.equal(tail.duration, 2);
  assert.ok(!trimItem(fast, "a", "end", 6).ok); // would need source up to 12 of 10
  assert.ok(trimItem(fast, "a", "end", 5).ok); // source up to 10
});

test("keyframes glide between their moments and hold outside them", () => {
  let project = withClip();
  project = must(setKeyframe(project, "a", { t: 0, scale: 1, opacity: 0 }));
  project = must(setKeyframe(project, "a", { t: 4, scale: 2, opacity: 1 }));
  const clipItem = first(project);
  assert.equal(animatedAt(clipItem, 2).scale, 1.5);
  assert.equal(animatedAt(clipItem, 2).opacity, 0.5);
  assert.equal(animatedAt(clipItem, 5).scale, 2);
  assert.equal(animatedAt(clipItem, 2).x, undefined);
  const moved = must(setKeyframe(project, "a", { t: 4.02, scale: 3 }));
  assert.equal(first(moved).keyframes?.length, 2);
  assert.equal(first(must(removeKeyframe(moved, "a", 4))).keyframes?.length, 1);
  assert.ok(!setKeyframe(project, "a", { t: 99, scale: 1 }).ok);
});

test("keyframes follow each half of a cut and shift with a trimmed start", () => {
  let project = must(setKeyframe(withClip(), "a", { t: 1, scale: 1 }));
  project = must(setKeyframe(project, "a", { t: 5, scale: 2 }));
  const cut = must(splitItem(project, "a", 3, "b"));
  const [head, tail] = items(cut);
  assert.ok(head?.kind === "video" && tail?.kind === "video");
  assert.deepEqual(head.keyframes?.map((k) => k.t), [1]);
  assert.deepEqual(tail.keyframes?.map((k) => k.t), [2]);
  const trimmed = first(must(trimItem(project, "a", "start", 2)));
  assert.deepEqual(trimmed.keyframes?.map((k) => k.t), [3]);
});

test("an entrance plays over the first moments and is then done", () => {
  const withIn = first(must(setTransition(withClip(), "a", { type: "fade", duration: 1 })));
  assert.deepEqual(entranceAt(withIn, 0.5), { type: "fade", progress: 0.5 });
  assert.equal(entranceAt(withIn, 1), null);
  assert.equal(entranceAt(first(withClip()), 0), null);
  assert.ok(!setTransition(must(addItem(withClip(), "audio", clip("s", 0, 2, 0, "audio"))), "s", { type: "fade", duration: 1 }).ok);
  assert.equal(first(must(setTransition(must(setTransition(withClip(), "a", { type: "zoom", duration: 1 })), "a", null))).transition, undefined);
});
