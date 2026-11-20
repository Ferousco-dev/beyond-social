import assert from "node:assert/strict";
import { test } from "node:test";

import { valuesFromAnalysis } from "./analysis-values.ts";
import { EMPTY_FORM } from "./types.ts";

const analysis = {
  summary: "A creator shows a three step skincare routine. It ends with a close-up of the serum.",
  hook: "Stop wasting money on skincare.",
  mood: "Upbeat",
  style: "Bright, handheld UGC",
  pacing: "Fast",
  voiceover: "Step one, cleanse. Step two, serum. Step three, moisturise.",
  whyItWorks: "",
  scenes: [
    { visual: "Face wash at the sink", action: "" },
    { visual: "Serum drop on the cheek", action: "" },
  ],
  speakers: 1,
  audience: null,
} as const;

test("a script that lands fills the empty form from the reference", () => {
  const patch = valuesFromAnalysis(EMPTY_FORM, analysis);
  assert.equal(patch.objective, "A creator shows a three step skincare routine.");
  assert.equal(patch.hook, "Stop wasting money on skincare.");
  assert.match(patch.scenes ?? "", /Scene 1: Face wash at the sink\n\nScene 2: Serum drop/);
  assert.equal(patch.dialogue, analysis.voiceover);
  assert.equal(patch.visualStyle, "Bright, handheld UGC");
  assert.notEqual(patch.cta, "");
});

test("words the person already typed are never overwritten by a late script", () => {
  const typed = { ...EMPTY_FORM, objective: "Sell my serum", hook: "My own opening", visualStyle: "Cinematic", seconds: 30 as const };
  const patch = valuesFromAnalysis(typed, analysis);
  assert.equal(patch.objective, "Sell my serum");
  assert.equal(patch.hook, "My own opening");
  assert.equal(patch.visualStyle, "Cinematic");
  assert.equal(patch.seconds, 30);
});

test("a reference with two speakers suggests a conversation, once", () => {
  const patch = valuesFromAnalysis(EMPTY_FORM, { ...analysis, speakers: 2 });
  assert.equal(patch.speakerMode, "conversation");
  assert.equal(patch.turns?.length, 2);
  assert.equal(valuesFromAnalysis({ ...EMPTY_FORM, speakerMode: "conversation" }, { ...analysis, speakers: 2 }).turns, undefined);
});

test("a long first sentence is cut to a one-line goal", () => {
  const patch = valuesFromAnalysis(EMPTY_FORM, { ...analysis, summary: `${"word ".repeat(60)}end.` });
  assert.ok((patch.objective ?? "").length <= 120);
  assert.match(patch.objective ?? "", /\.\.\.$/);
});
