import assert from "node:assert/strict";
import { test } from "node:test";

import { framePlan, unusedAssetNotes, type AssetChoices, type UsableAsset } from "./asset-use.ts";

const assets: UsableAsset[] = [
  { id: "f", label: "Ada", file_kind: "image", media_id: "mf" },
  { id: "p", label: "Serum", file_kind: "image", media_id: "mp" },
  { id: "e", label: "Kitchen", file_kind: "video", media_id: "me" },
  { id: "k", label: "Kitchen photo", file_kind: "image", media_id: "mk" },
];
const none: AssetChoices = { speakerMode: "single", faceAssetId: "", voiceAssetId: "", productAssetId: "", environmentAssetId: "" };

test("nothing is said when every pick is used", () => {
  assert.deepEqual(unusedAssetNotes({ ...none, productAssetId: "p" }, assets), []);
  assert.deepEqual(unusedAssetNotes(none, assets), []);
});

test("a clip with two pictures starts on the first and ends on the second", () => {
  const choices = { ...none, faceAssetId: "f", productAssetId: "p" };
  assert.deepEqual(unusedAssetNotes(choices, assets), []);
  const plan = framePlan(choices, assets);
  assert.equal(plan.start?.media_id, "mf");
  assert.equal(plan.end?.media_id, "mp");
});

test("a third picture is the only one left out", () => {
  const notes = unusedAssetNotes({ ...none, faceAssetId: "f", productAssetId: "p", environmentAssetId: "k" }, assets);
  assert.equal(notes.length, 1);
  assert.match(notes[0] ?? "", /"Kitchen photo" will not appear/);
});

test("a video asset cannot start a clip", () => {
  const notes = unusedAssetNotes({ ...none, environmentAssetId: "e" }, assets);
  assert.match(notes[0] ?? "", /only pictures/);
});

test("a talking video ignores product and environment", () => {
  const notes = unusedAssetNotes({ ...none, faceAssetId: "f", voiceAssetId: "v", productAssetId: "p", environmentAssetId: "e" }, assets);
  assert.equal(notes.length, 2);
  assert.match(notes[0] ?? "", /talking video/);
});

test("a conversation ignores product and environment", () => {
  const notes = unusedAssetNotes({ ...none, speakerMode: "conversation", productAssetId: "p" }, assets);
  assert.match(notes[0] ?? "", /conversation/);
});
