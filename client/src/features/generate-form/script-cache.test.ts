import assert from "node:assert/strict";
import test from "node:test";

import { recallScript, rememberScript, SCRIPT_TTL_MS, type ScriptStore } from "./script-cache.ts";

function memoryStore(): ScriptStore {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const eight = { hook: "Eight hook", scenes: "Eight scenes", dialogue: "Eight words" };
const ten = { hook: "Ten hook", scenes: "Ten scenes", dialogue: "Ten words" };

test("going back to a length shows its script again without asking our AI", () => {
  const store = memoryStore();
  rememberScript(store, "A cake promo", 8, eight, 1000);
  rememberScript(store, "A cake promo", 10, ten, 2000);
  assert.deepEqual(recallScript(store, "A cake promo", 8, 3000), eight);
  assert.deepEqual(recallScript(store, "A cake promo", 10, 3000), ten);
});

test("a different idea or an expired script is written again", () => {
  const store = memoryStore();
  rememberScript(store, "A cake promo", 8, eight, 1000);
  assert.equal(recallScript(store, "A bread promo", 8, 2000), null);
  assert.equal(recallScript(store, "A cake promo", 8, 1000 + SCRIPT_TTL_MS + 1), null);
});

test("an empty script or a broken store is never reused", () => {
  const store = memoryStore();
  rememberScript(store, "A cake promo", 8, { hook: "", scenes: "", dialogue: "" }, 1000);
  assert.equal(recallScript(store, "A cake promo", 8, 1000), null);
  store.setItem("bs:script-cache", "not json");
  assert.equal(recallScript(store, "A cake promo", 8, 1000), null);
});
