import assert from "node:assert/strict";
import { test } from "node:test";

import { checkEverySeconds, isDown, nextFailures } from "./service-health.ts";

test("one failed check does not raise the banner, two in a row do", () => {
  const one = nextFailures(0, false);
  assert.equal(isDown(one), false);
  assert.equal(isDown(nextFailures(one, false)), true);
});

test("a good check clears the count and the banner", () => {
  assert.equal(nextFailures(5, true), 0);
  assert.equal(isDown(nextFailures(5, true)), false);
});

test("checks are quicker while something is wrong", () => {
  assert.ok(checkEverySeconds(1) < checkEverySeconds(0));
});
