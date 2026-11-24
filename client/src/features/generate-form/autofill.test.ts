import assert from "node:assert/strict";
import { test } from "node:test";

import { valuesFromBrief } from "./autofill.ts";
import { EMPTY_FORM } from "./types.ts";

const brief = {
  title: "Serum launch",
  objective: "Promote my new glow serum",
  purpose: "promotion",
  audience: { gender: "female" as const, ages: ["25-34"], interests: ["Beauty"] },
  product: "Glow serum",
  language: "English",
  platform: "TikTok",
  seconds: 30,
  visual_style: "Warm and natural",
  environment: "Home",
  content_kind: "Human-led",
  hook: "Stop scrolling",
  scenes: "Ada holds the serum",
  dialogue: "This changed my skin",
  tone: "Calm",
  cta: "Shop now, link in bio",
  speaker_mode: "single" as const,
  face_asset_id: "face-1",
  voice_asset_id: "",
  product_asset_id: "serum-1",
  environment_asset_id: "",
};

test("a brief fills every step of the form", () => {
  const patch = valuesFromBrief(EMPTY_FORM, brief);
  assert.equal(patch.objective, "Promote my new glow serum");
  assert.equal(patch.seconds, 30);
  assert.equal(patch.visualStyle, "Warm and natural");
  assert.equal(patch.faceAssetId, "face-1");
  assert.equal(patch.productAssetId, "serum-1");
  assert.deepEqual(patch.audience, { gender: "female", ages: ["25-34"], interests: ["Beauty"] });
  assert.equal(patch.storyboard, null, "an old storyboard is dropped for the new script");
});

test("empty answers never wipe what the person already chose", () => {
  const current = { ...EMPTY_FORM, environmentAssetId: "kitchen", visualStyle: "Cinematic", title: "Mine" };
  const patch = valuesFromBrief(current, { ...brief, title: "", visual_style: "", environment_asset_id: "" });
  assert.equal(patch.title, "Mine");
  assert.equal(patch.visualStyle, "Cinematic");
  assert.equal(patch.environmentAssetId, undefined);
});

test("a conversation gets two empty turns to fill", () => {
  const patch = valuesFromBrief(EMPTY_FORM, { ...brief, speaker_mode: "conversation" });
  assert.equal(patch.speakerMode, "conversation");
  assert.equal(patch.turns?.length, 2);
});
