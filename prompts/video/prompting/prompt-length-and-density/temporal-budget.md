---
id: prompt-length-and-density-temporal-budget
title: Scaling described action to clip duration
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, pacing, duration]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

The amount of described action must scale down, not up, as clip duration
shrinks. A four-second clip has room for roughly one beat, and prompting a
multi-beat arc inside a short clip produces rushed, physically compressed
motion.

- Budget one clear beat, a single action with a start and an end, per
  3-5 seconds of generated clip.
- For clips under three seconds, prompt a single continuous motion, a reach,
  a turn, a step, rather than an action with distinct phases.
- If the concept genuinely needs multiple beats, extend the duration or split
  it into multiple clips edited together. Do not compress the beats into one
  prompt.
- Match verb aspect to duration: "beginning to reach for" fits a short clip;
  "reaches, grabs, and turns to leave" needs more seconds than most models
  default to.

Why: video models allocate a fixed number of frames to whatever motion is
described, so an overloaded action list gets time-compressed to fit. Time-
compressed human motion reads as sped-up or mechanical, because real bodies
do not move through multiple distinct actions at a fraction of their natural
duration, and that mismatch is a fast, recognizable synthetic tell.

Example, three-second clip: "A hand reaches into frame and picks up a coffee
cup."
Counter-example, three-second clip: "A hand reaches into frame, picks up a
coffee cup, brings it to the mouth, takes a sip, and sets it back down" — five
beats crammed into three seconds forces the model to compress each motion,
and the result moves at an inhuman, jittery speed.
