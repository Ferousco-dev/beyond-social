import assert from "node:assert/strict";
import { test } from "node:test";

import { standardType, withStandardType } from "./file-type.ts";

test("other names for a format become the standard one", () => {
  assert.equal(standardType("audio/x-m4a"), "audio/mp4");
  assert.equal(standardType("Audio/X-WAV"), "audio/wav");
  assert.equal(standardType("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(standardType("image/png"), "image/png");
  assert.equal(standardType(""), "");
});

test("a file is relabelled only when its type has another standard name", () => {
  const m4a = new File([new Uint8Array([1, 2, 3])], "voice.m4a", { type: "audio/x-m4a" });
  const relabelled = withStandardType(m4a);
  assert.equal(relabelled.type, "audio/mp4");
  assert.equal(relabelled.name, "voice.m4a");
  assert.equal(relabelled.size, 3);
  const mp3 = new File([new Uint8Array([1])], "voice.mp3", { type: "audio/mpeg" });
  assert.equal(withStandardType(mp3), mp3);
});
