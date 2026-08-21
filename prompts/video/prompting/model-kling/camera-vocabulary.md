---
id: model-kling-camera-vocabulary
title: Camera-movement vocabulary Kling actually follows
category: video-prompting
subcategory: model-kling
tags: [camera-movement, cinematography, camera-control, terminology]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Kling's camera-control inputs and its text-prompt camera language respond most
reliably to a short, closed set of terms borrowed from real production
vocabulary, not from mood adjectives.

- Reliable verbs: pan left/right, tilt up/down, dolly in/out, truck
  left/right, push in, pull back, static/locked-off, handheld, orbit around
  subject.
- State speed explicitly ("slow dolly in," "fast whip pan"). An unqualified
  movement defaults to a medium pace that often reads as generic.
- Combine at most two camera actions per prompt (e.g. "slow push in while
  tilting slightly down"); three or more compete for the same motion budget as
  the subject's own movement.
- Skip vague direction like "cinematic camera move" or "dynamic shot." These
  don't map to a specific vector, so the model falls back to a default drift.
- When using dedicated camera-control sliders (pan/tilt/zoom/roll), keep the
  text prompt's camera description consistent with the slider direction.
  Contradicting them produces a hesitant, corrected-mid-shot move.

Why: the model was fine-tuned on captioned footage using exactly this
professional vocabulary, so these tokens map to learned motion vectors, while
generic adjectives have no consistent vector and get resolved arbitrarily by
the sampler.

Example: "handheld, slow push in on subject's hands tying a knot, slight
natural sway."
Counter-example: "epic dynamic cinematic camera work" — no directional
information, so the render defaults to a soft, unmotivated zoom that looks
templated.
