import assert from "node:assert/strict";
import { test } from "node:test";

import { pickSceneCuts, type FrameDiff } from "./scene-detect.ts";

test("detects hard scene cuts cleanly", () => {
  const samples: FrameDiff[] = [];
  for (let i = 1; i <= 40; i += 1) {
    const time = i * 0.25;
    const isCut = time === 3.0 || time === 6.5;
    samples.push({ time, diff: isCut ? 0.55 : 0.04 });
  }
  assert.deepEqual(pickSceneCuts(samples, { start: 0, end: 10 }), [3.0, 6.5]);
});

test("ignores smooth camera motion without sharp spikes", () => {
  const samples: FrameDiff[] = [];
  for (let i = 1; i <= 40; i += 1) {
    samples.push({ time: i * 0.25, diff: 0.24 + (i % 2) * 0.02 });
  }
  assert.deepEqual(pickSceneCuts(samples, { start: 0, end: 10 }), []);
});

test("enforces minimum scene spacing and keeps the strongest spike", () => {
  const samples: FrameDiff[] = [];
  for (let i = 1; i <= 32; i += 1) {
    const time = i * 0.25;
    let diff = 0.03;
    if (time === 0.5) diff = 0.7; // too close to start
    if (time === 3.0) diff = 0.45;
    if (time === 3.5) diff = 0.68; // stronger spike within 1.0s of 3.0
    if (time === 7.5) diff = 0.7; // too close to end
    samples.push({ time, diff });
  }
  assert.deepEqual(pickSceneCuts(samples, { start: 0, end: 8 }), [3.5]);
});
