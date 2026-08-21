---
id: staging-and-blocking-two-shot-depth-stacking
title: Staggering two subjects in depth instead of lining them up flat
category: cinematography
subcategory: staging-and-blocking
tags: [two-shot, multi-subject, depth, blocking]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Two people in one frame read as staged and stiff when placed at identical
height and identical distance from camera, side by side like a school photo;
staggering them in depth and height reads as a real, occupied space.

- Place one subject slightly closer to camera than the other, not on the same
  focal plane; the nearer subject can be slightly soft or slightly sharper
  depending on which one the moment favors.
- Vary height in frame by staging one subject seated, leaning, or a half-step
  back rather than two people standing at identical eye level side by side.
- For an over-the-shoulder exchange, keep the foreground subject's shoulder and
  out-of-focus ear occupying the near-frame edge, roughly a third of frame
  width, with the addressed subject held in the remaining two-thirds.
- State each subject's screen position and depth explicitly in the prompt
  ("subject A foreground left, subject B midground right, both a half-step
  apart in distance from camera") since the model has no blocking to infer from.
- Do not describe two subjects only by identity and action ("two people
  talking"); without stated position and depth, the model tends to default to
  a flat, centered, equidistant lineup.

Why: real conversations happen at slightly different distances and heights
because people don't choreograph their standing position — one leans on a
counter, one stands a step back, one turns slightly. A flat, symmetric lineup
is a staging choice usually reserved for formal portraits, not candid exchange,
so using it by default undercuts the "real interaction" the shot is going for.

Example: "subject A foreground-left, half-turned, shoulder and blurred ear at
frame edge; subject B midground-right, fully in focus, one head-height further
from camera."
Counter-example: "two people standing side by side facing camera" — produces a
flat, equidistant lineup that reads as a posed group photo, not a conversation.
