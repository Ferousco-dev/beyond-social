import assert from "node:assert/strict";
import { test } from "node:test";

import { projectDuration } from "./find.ts";
import { commit, createHistory, redo, undo } from "./history.ts";
import { addItem, deleteItem, moveItem, replaceCaptions, restyleCaptions, splitItem, trimItem, updateItem } from "./ops.ts";
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
  overlapping.tracks[2]?.items.push(clip("b", 3, 2));
  assert.ok(!parseProject(overlapping).ok);
  const misplaced = emptyProject();
  misplaced.tracks[3]?.items.push(clip("a", 0, 2));
  assert.ok(!parseProject(misplaced).ok);
  const duplicate = withClip();
  duplicate.tracks[3]?.items.push(clip("a", 0, 2, 0, "audio"));
  assert.ok(!parseProject(duplicate).ok);
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
  op: "seek", item_id: "", text: "", at: 0, start: 0, duration: 0, edge: "", volume: 0, color: "", size: 0, y: 0, ...patch,
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
  assert.equal(items(result.project, "captions").length, 1);
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
