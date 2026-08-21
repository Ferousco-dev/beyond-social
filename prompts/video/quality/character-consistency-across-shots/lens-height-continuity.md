---
id: character-consistency-across-shots-lens-height-continuity
title: Match focal length and camera height across shot and reverse shot
category: video-quality
subcategory: character-consistency
tags: [character-consistency, camera, lens, coverage]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A face photographed on a wide lens close up and the same face on a long lens from
farther away do not read as the same proportions, even before the generation model
adds its own variance. Coverage of one character across multiple shots needs a
locked focal length and camera height, the same way a real DP would pick one lens
family for a scene's coverage.

The recipe:

- Pick one focal length band for close coverage (roughly 50-85mm equivalent) and
  state it in every close-up prompt for that character in that scene; switching
  between an 24mm-equivalent wide and an 85mm-equivalent close-up changes perceived
  nose length and face width independent of any model drift.
- Keep camera height at eye level unless the scene calls for a deliberate low or high
  angle, and state that height choice consistently, since a shift from eye-level to
  slightly-low reshapes the jawline in the frame.
- For shot/reverse-shot pairs (two characters talking), keep both characters' lens
  and height matched to each other, not just matched to their own prior shots.
- Avoid extreme wide-angle framing for hero close-ups entirely; wide lenses
  exaggerate facial features in ways that compound with the model's own tendency to
  drift, making the character harder to hold consistent.
- Name the lens/height pairing once per scene in planning notes so every shot prompt
  in that scene pulls from the same spec instead of being chosen shot by shot.

Why: focal length changes perspective compression, which changes how far apart facial
features appear to sit; that's a real optical effect independent of the generation
model, and stacking it on top of model-level identity drift makes shots diverge faster
than either factor alone would.

Example: "85mm equivalent, eye-level, medium close-up" specified for every close shot
in the scene.
Counter-example: an establishing wide on a 24mm-equivalent lens followed by a close-up
on a 35mm-equivalent lens for supposedly the same face, in the same scene.
