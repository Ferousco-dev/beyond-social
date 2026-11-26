import assert from "node:assert/strict";
import test from "node:test";

import { parseDimension } from "./format.ts";

test("a typed size becomes the nearest frame the model makes", () => {
  assert.equal(parseDimension("16:9"), "16:9");
  assert.equal(parseDimension("1920x1080"), "16:9");
  assert.equal(parseDimension("1:1"), "1:1");
  assert.equal(parseDimension("4:5"), "1:1");
  assert.equal(parseDimension("9:16"), "9:16");
  assert.equal(parseDimension("1080 x 1920"), "9:16");
});

test("anything that is not a size is refused", () => {
  assert.equal(parseDimension(""), null);
  assert.equal(parseDimension("youtube"), null);
  assert.equal(parseDimension("0:9"), null);
});
