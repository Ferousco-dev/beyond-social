import assert from "node:assert/strict";
import { test } from "node:test";

import { openedDocument } from "./opened-document.ts";
import { type ProjectGeneration } from "./types.ts";

const generation = { jobId: "11111111-1111-4111-8111-111111111111", script: "A young man sits at a desk.", state: "running" } as ProjectGeneration;

test("a just-generated project keeps its job when the editor opens it", () => {
  const opened = openedDocument({ generation }, generation) as { generation?: ProjectGeneration; tracks: unknown[] };
  assert.deepEqual(opened.generation, generation);
  assert.equal(opened.tracks.length, 5);
});

test("an edited project opens exactly as saved", () => {
  const saved = { version: 1, tracks: [], generation };
  assert.equal(openedDocument(saved, generation), saved);
});
