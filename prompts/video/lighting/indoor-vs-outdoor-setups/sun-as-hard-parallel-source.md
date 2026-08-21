---
id: indoor-vs-outdoor-setups-sun-as-hard-parallel-source
title: The sun as an infinite, parallel-ray hard source
category: lighting
subcategory: indoor-vs-outdoor-setups
tags: [outdoor, sun, hard-light, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Outdoor sun acts as an effectively infinite point source with parallel rays and no
falloff, the opposite of a window's near-field falloff. Naming a fixed sun
position keeps shadows physically consistent across a shot.

- No falloff with distance: a subject 2m or 20m from camera is lit identically by
  the sun. Outdoor light does not dim as action moves deeper into frame.
- Shadow direction and length lock to one implied sun position. Every shadow in
  frame, subject, prop, building, must fall the same way. State it once: "low sun
  camera-left" and keep it consistent across cuts in the same scene.
- Shadow edges stay hard and crisp on a clear day unless something diffuses them
  (cloud, overhang, scrim); even shaded pockets keep sharp contact shadows.
- This parallel-source behavior disappears under overcast, where the sky itself
  becomes the source instead of the sun (see the dome-softbox file for that case).

Why: outdoor footage in training data is dominated by hard, directionally
consistent sunlight, so naming one fixed sun direction stops the model from
inventing a different shadow direction shot to shot, one of the more visible
continuity tells in generated exteriors.

Example: "clear midday, hard sun from camera-right, short sharp shadows on the
subject matching the fence line's shadow direction behind them."
Counter-example: shadows falling different ways in the same shot, or leaving sun
direction unstated so the model improvises inconsistent shadows between cuts.
