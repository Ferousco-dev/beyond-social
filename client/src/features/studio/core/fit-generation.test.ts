import assert from "node:assert/strict";
import { test } from "node:test";

import { fitGeneration } from "./fit-generation.ts";
import { projectGenerationSchema } from "./types.ts";

const job = "11111111-1111-4111-8111-111111111111";
const key = "22222222-2222-4222-8222-222222222222";

test("an over-long record is cut to fit instead of being dropped", () => {
  const long = {
    jobId: job,
    script: "x".repeat(6000),
    state: "running",
    generator: "long",
    parts: [{ key, prompt: "y".repeat(3000), seconds: 8, state: "running", jobId: job, message: "z".repeat(400) }],
  };
  assert.equal(projectGenerationSchema.safeParse(long).success, false, "the raw record fails, which left the editor empty");
  const fitted = fitGeneration(long);
  const parsed = projectGenerationSchema.safeParse(fitted);
  assert.ok(parsed.success, "the fitted record passes");
  assert.equal(parsed.data.script.length, 5000);
  assert.equal(parsed.data.parts?.[0]?.prompt.length, 2500);
  assert.equal(parsed.data.parts?.[0]?.jobId, job, "everything else is kept");
});

test("a record that already fits is unchanged, and non-records pass through", () => {
  const ok = { jobId: job, script: "short", state: "running" };
  assert.deepEqual(fitGeneration(ok), ok);
  assert.equal(fitGeneration(undefined), undefined);
});
