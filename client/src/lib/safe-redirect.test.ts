import assert from "node:assert/strict";
import { test } from "node:test";

import { safeRedirect } from "./safe-redirect.ts";

test("same-origin paths are followed", () => {
  assert.equal(safeRedirect("/dashboard/library"), "/dashboard/library");
  assert.equal(safeRedirect("/editor/abc?x=1"), "/editor/abc?x=1");
});

test("anything that could leave the site falls back", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "javascript:alert(1)", "", null, undefined]) {
    assert.equal(safeRedirect(bad), "/dashboard", String(bad));
  }
  assert.equal(safeRedirect("//evil.com", "/home"), "/home");
});
