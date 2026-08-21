---
id: per-platform-native-conventions-tiktok-completion-window
title: TikTok's algorithmic test window rewards early completion and rewatch
category: platform-format
subcategory: per-platform-native-conventions
tags: [tiktok, algorithm, completion-rate, rewatch]
applicability:
  platforms: [tiktok]
  productTypes: [short-form-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

TikTok's recommendation system tests a new video against a small initial
audience and largely decides on further push from completion rate and rewatch
rate in that window, which makes the first 1-3 seconds and the total runtime
literal algorithmic inputs, not just craft choices.

- Treat the first 1-3 seconds as a distinct unit that must work with sound off
  and on, since the initial test push happens before you know who's watching.
- Design a rewatch trigger: a visual or audio detail that only lands on a
  second viewing (a background sight gag, a line that recontextualizes the
  opening) directly targets the rewatch signal the algorithm weights.
- Cut any pre-hook runtime, a slow logo or brand card; every second before the
  hook lowers completion in exactly the window that determines the push.
- Keep total runtime tight enough that a full watch is realistic for the
  target audience; a 9-second video at 80% completion out-distributes a
  25-second video at 40% completion.

Why: TikTok's distribution is a staged test, a small pool first, then a wider
push only if completion and rewatch clear a bar, so the opening seconds and
overall length are the literal numbers the algorithm scores before anyone
else sees the video, not abstract best practice.

Example: a 10-second video that ends on a sight gag only visible if the viewer
notices a background detail planted in frame one, engineered to earn rewatches.

Counter-example: a 5-second static logo intro before content starts; the
algorithm's initial test pool drops off before the actual video begins.
