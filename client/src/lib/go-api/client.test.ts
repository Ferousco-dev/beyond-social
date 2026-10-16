import assert from "node:assert/strict";
import test from "node:test";

import { buildRequestConfig } from "./request-config.ts";

test("public Go API requests can be cached for static marketing pages", () => {
  const config = buildRequestConfig({ anonymous: true, method: "GET" });

  assert.equal(config.cache, "force-cache");
  assert.deepEqual(config.next, { revalidate: 300 });
});

test("authenticated Go API requests stay uncached", () => {
  const config = buildRequestConfig({ method: "GET" });

  assert.equal(config.cache, "no-store");
  assert.equal(config.next, undefined);
});
