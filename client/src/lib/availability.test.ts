import assert from "node:assert/strict";
import test from "node:test";

import { routeAvailability } from "./availability.ts";

test("project management and editor routes are available", () => {
  for (const path of ["/dashboard/projects", "/editor", "/editor/123e4567-e89b-42d3-a456-426614174000"]) {
    assert.equal(routeAvailability(path), "available", path);
  }
});

test("unknown dashboard pages remain unavailable", () => {
  assert.equal(routeAvailability("/dashboard/legacy-reports"), "page-unavailable");
});