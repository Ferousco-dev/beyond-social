import assert from "node:assert/strict";
import { test } from "node:test";

import { describeProject } from "./describe.ts";
import { emptyProject } from "./validate.ts";

test("the assistant is told about a marked stretch of the video, and only when there is one", () => {
  const marked = JSON.parse(describeProject(emptyProject(), 0, {}, { start: 3.004, end: 7.5 })) as { selection?: { start: number; end: number } };
  assert.deepEqual(marked.selection, { start: 3, end: 7.5 });
  const whole = JSON.parse(describeProject(emptyProject(), 0)) as { selection?: unknown };
  assert.equal(whole.selection, undefined);
});
