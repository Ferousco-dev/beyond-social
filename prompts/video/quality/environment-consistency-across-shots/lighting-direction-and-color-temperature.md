---
id: environment-consistency-across-shots-lighting-direction-and-color-temperature
title: Locking light direction and color temperature across cuts
category: video-quality
subcategory: lighting-continuity
tags: [lighting, continuity, color-temperature, cinematography]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

The key light's direction and color temperature must stay fixed across every shot
in a scene, or cuts will feel wrong even when the viewer can't name why.

The recipe:

- Name the key light source and its screen direction in every shot prompt
  ("hard sunlight from camera-left, low angle"), not just "sunny."
- Pin color temperature in Kelvin, and if the scene mixes sources (tungsten
  practical against a daylight window), state the ratio between them.
- State shadow direction and time of day explicitly for every shot of the same
  scene rather than letting each shot re-guess it.
- If a window is the light source, specify which side of frame it sits on and
  keep that identical shot to shot.
- Hold the fill ratio (soft, low-contrast fill versus hard, high-contrast)
  constant across shots meant to be continuous.

Why: generative models have no memory of a prior shot's lighting setup; each
prompt builds the scene fresh unless it's anchored explicitly. A flipped shadow
side or a warm-to-cool color shift between adjacent cuts is one of the fastest
things a viewer's eye catches, because it's a physics violation learned from a
lifetime of watching real light behave consistently.

Example: "key light from camera-left, hard afternoon sun, 5600K, shadows
falling screen-right at roughly 30 degrees" repeated verbatim across shots 2
through 5.
Counter-example: "nice lighting" in shot 1, "moody lighting" in shot 3 — the
model reinterprets from scratch each time, shadows flip sides, and the scene
reads as two different rooms spliced together.
