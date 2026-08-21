---
id: character-consistency-across-shots-color-grade-consistency
title: Hold one color grade across the sequence to reinforce identity
category: video-quality
subcategory: character-consistency
tags: [character-consistency, color-grading, continuity, post]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Skin renders differently under different color grades: a warm grade pushes skin
toward orange-red, a cool or teal-leaning grade pushes it toward the opposite, and a
face that looks like a consistent person under one grade can look like a subtly
different person under another. Sequences need one grade spec applied uniformly, not
chosen fresh per shot.

The recipe:

- Decide a white balance and grade direction once per scene (neutral, warm, cool, or
  a specific named look) and state it identically in every shot's prompt or in the
  post-processing pass applied uniformly across the batch.
- If grading happens in post rather than in the generation prompt, apply the LUT or
  grade to the whole sequence in one pass rather than shot by shot, so any per-shot
  variance in the raw output gets pulled toward the same target rather than amplified.
- Keep skin tone as the reference point when judging whether a grade is landing
  consistently; background colors can drift a little without breaking the read, but
  skin tone drift reads immediately as identity drift.
- Match grade intensity, not just direction; a light warm push in shot one and a
  heavy warm push in shot four will make the same skin tone look like two different
  people even though the direction is technically consistent.
- Treat grade as a scene-level decision, changed only at genuine scene breaks, not a
  shot-level stylistic choice.

Why: color grading operates on the same skin-tone information a viewer's face
recognition partly relies on, so inconsistent grading is functionally similar to
inconsistent lighting: it changes the read of the face independent of any change to
the underlying generated geometry.

Example: one neutral-warm grade (white balance around 5000K, mild warm push) applied
across the entire finished sequence in a single pass.
Counter-example: grading each shot individually to "look good" in isolation, landing
on a cool teal shot 1 and a warm amber shot 4 for what's meant to be one continuous
scene.
