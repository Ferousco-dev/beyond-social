import assert from "node:assert/strict";
import { test } from "node:test";

import { fits, recommendedLength, shortestFit, spokenText, toLength } from "./pacing.ts";

const words = (n: number): string => Array.from({ length: n }, () => "word").join(" ");

test("speech fits at about two and a half words a second", () => {
  assert.equal(fits(words(25), 10), true);
  assert.equal(fits(words(26), 10), false);
  assert.equal(fits("", 5), true);
});

test("the shortest fitting length is offered, or none past the longest clip", () => {
  assert.equal(shortestFit(words(12)), 5);
  assert.equal(shortestFit(words(30)), 15);
  assert.equal(shortestFit(words(38)), null);
});

test("the recommendation never undercuts the words or the kind of video", () => {
  assert.equal(recommendedLength(words(4), "Product-focused"), 8);
  assert.equal(recommendedLength(words(4), "Human-led"), 10);
  assert.equal(recommendedLength(words(30), "Product-focused"), 15);
});

test("older drafts snap up to an offered length", () => {
  assert.equal(toLength(3), 5);
  assert.equal(toLength(12), 15);
  assert.equal(toLength(40), 15);
});

test("only the dialogue and the call to action are spoken", () => {
  assert.equal(spokenText({ dialogue: " Hi there ", cta: "" }), "Hi there");
  assert.equal(spokenText({ dialogue: "Hi", cta: "Follow" }), "Hi\nFollow");
});
