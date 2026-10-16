import assert from "node:assert/strict";
import { test } from "node:test";

import { findWatchableLink, isYouTubeLink, parseShortLink, parseSocialUrl } from "./url.ts";

test("share-sheet links are recognised without being followed", () => {
  assert.deepEqual(parseShortLink("https://vm.tiktok.com/ZMabc123/"), { platform: "tiktok", url: "https://vm.tiktok.com/ZMabc123/" });
  assert.equal(parseShortLink("https://m.tiktok.com/t/ZTabc123/?utm=x")?.url, "https://m.tiktok.com/t/ZTabc123/");
  assert.equal(parseShortLink("https://www.tiktok.com/t/ZTabc123/?utm=x")?.url, "https://www.tiktok.com/t/ZTabc123/");
  assert.equal(parseShortLink("https://instagr.am/p/Cabc123/")?.platform, "instagram");
  assert.equal(parseShortLink("https://m.instagram.com/share/reel/BAbc123/?utm=x")?.platform, "instagram");
  assert.equal(parseShortLink("https://www.instagram.com/share/reel/BAbc123/")?.platform, "instagram");
});

test("anything else is not a short link", () => {
  for (const bad of ["http://vm.tiktok.com/ZMabc123/", "https://vm.tiktok.com/", "https://vm.tiktok.com.evil.example/x", "https://evil.example/t/abc", "not a link", "https://user@vm.tiktok.com/x"]) {
    assert.equal(parseShortLink(bad), null, bad);
  }
});

test("YouTube links of every common shape are recognised", () => {
  for (const good of ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5", "https://m.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/shorts/dQw4w9WgXcQ"]) {
    assert.equal(isYouTubeLink(good), true, good);
  }
  for (const bad of ["https://www.youtube.com/watch?v=short", "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ", "http://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/channel/abc"]) {
    assert.equal(isYouTubeLink(bad), false, bad);
  }
});

test("a message is checked for a link the chat can watch", () => {
  assert.equal(findWatchableLink("remake this https://vm.tiktok.com/ZMabc123/ for my shop."), "https://vm.tiktok.com/ZMabc123/");
  assert.equal(findWatchableLink("like https://youtu.be/dQw4w9WgXcQ!"), "https://youtu.be/dQw4w9WgXcQ");
  assert.equal(findWatchableLink("see https://example.com/page"), null);
  assert.equal(findWatchableLink("no link here"), null);
  assert.ok(parseSocialUrl("https://www.tiktok.com/@a/video/7300000000"));
});
