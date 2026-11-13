import assert from "node:assert/strict";
import { test } from "node:test";

import { retryWithoutCors } from "./cors-retry.ts";

test("a refused CORS request is asked again once, without CORS", () => {
  const element = { crossOrigin: "anonymous" as string | null };
  let reloads = 0;
  assert.equal(retryWithoutCors(element, () => reloads++), true);
  assert.equal(element.crossOrigin, null);
  assert.equal(reloads, 1);
  // A second failure is a real failure: no loop.
  assert.equal(retryWithoutCors(element, () => reloads++), false);
  assert.equal(reloads, 1);
});

test("an element that never asked for CORS is not retried", () => {
  assert.equal(retryWithoutCors({ crossOrigin: null }, () => assert.fail("must not reload")), false);
});
