---
id: model-infinitetalk-lipsync-saccadic-eye-movement
title: Micro eye movement instead of a locked camera stare
category: video-prompting
subcategory: eye-movement
tags: [infinitetalk, eyes, saccades, gaze]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Real speakers rarely hold dead-fixed eye contact with a lens; their gaze makes
small saccades, brief shifts off-axis and back, especially while forming the
next thought. A talking avatar with eyes locked perfectly on camera for the
entire clip looks like a mounted photo with a moving mouth, not a person.

- Prompt for "natural gaze, small eye movements, glancing slightly off-lens
  and returning" rather than "looking directly at camera" alone.
- Tie gaze shifts to thinking beats: a downward or sideways glance just before
  a new clause reads as someone forming a thought, not a tracking error.
- Keep the shifts small; a few degrees of gaze deviation is convincing, a full
  head turn away from camera mid-sentence breaks the direct-address format
  most short-form talking-head content depends on.
- For UGC-style content specifically, slightly imperfect eye contact (near-lens
  rather than lens-locked) is closer to how people actually film phone selfies.

Why: perfectly still, perfectly centered eye contact is statistically rare in
unscripted human speech and effortful even in trained on-camera talent; the
model's easiest solution is a static gaze, so leaving it unprompted defaults to
the least human option available.

Example: "natural gaze with small saccades, brief glance down-left before the
second sentence, then back to camera."

Counter-example: "subject stares directly into the lens without blinking or
moving their eyes," which produces the thousand-yard-stare look common to
early-generation synthetic avatars.
