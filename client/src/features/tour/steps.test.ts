import assert from "node:assert/strict";
import test from "node:test";

import { TOURS, onPage, pageRun, pageStart, parseProgress } from "./steps.ts";

const steps = TOURS["first-video"];

test("the first-video tour starts on New Video and ends on the Generate button", () => {
  assert.equal(steps[0]?.page, "/dashboard/new");
  assert.equal(steps.at(-1)?.target, "video-generate");
});

test("a page run covers only that page's steps, from where the person is", () => {
  assert.deepEqual(pageRun(steps, 0, "/dashboard/new"), [0, 2]);
  assert.deepEqual(pageRun(steps, 1, "/dashboard/new"), [1, 2]);
  assert.deepEqual(pageRun(steps, 3, "/dashboard/videos/new"), [3, 6]);
});

test("a step waiting on another page shows nothing here", () => {
  assert.equal(pageRun(steps, 3, "/dashboard/new"), null);
  assert.equal(pageRun(steps, 0, "/dashboard/projects"), null);
  assert.equal(pageRun(steps, steps.length, "/dashboard/new"), null);
});

test("the editor tour matches any project page", () => {
  const first = TOURS.editor[0]!;
  assert.equal(onPage(first, "/editor/abc"), true);
  assert.equal(onPage(first, "/editor"), false);
});

test("saved progress is read defensively", () => {
  assert.equal(parseProgress(null), null);
  assert.equal(parseProgress("not json"), null);
  assert.deepEqual(parseProgress('{"step":3,"done":false}'), { step: 3, done: false });
  assert.deepEqual(parseProgress('{"step":-1,"done":true}'), { step: 0, done: true });
});

test("coming back mid-page starts that page's steps again", () => {
  assert.equal(pageStart(steps, 2), 0);
  assert.equal(pageStart(steps, 5), 3);
  assert.equal(pageStart(steps, 0), 0);
});
