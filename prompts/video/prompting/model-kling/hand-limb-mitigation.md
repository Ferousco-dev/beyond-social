---
id: model-kling-hand-limb-mitigation
title: Kling-specific mitigation for hand and limb artifacts
category: video-prompting
subcategory: model-kling
tags: [hands, limbs, artifacts, mitigation]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Hands remain Kling's most fragile geometry, more so than faces, because
fingers are small, high-degrees-of-freedom, and frequently self-occluding;
the mitigation is compositional, not just a negative prompt.

- Frame hands doing one simple, familiar action at a time, holding, resting,
  pointing, rather than manipulating an object with fine motor detail,
  typing, shuffling cards, tying a precise knot.
- Keep hands partially out of frame or in soft focus when they aren't the
  subject of the shot. Background hands in a crowd or at a table edge are a
  common, avoidable source of artifacts.
- Favor camera angles where fingers don't overlap each other or the object
  they're touching from the camera's point of view. Occlusion is where the
  model most often loses count of fingers.
- If a hand action is essential to the concept, a product being picked up,
  shoot it as its own short, simple clip rather than folding it into a busier
  composition with other motion competing for budget.

Why: the model has to track finger identity and position through every frame
while also resolving occlusion, and it has comparatively sparse high-fidelity
training data for hands compared to faces or torsos. Any added complexity,
fast motion, occlusion, fine manipulation, pushes it past the point where it
can keep finger count and shape consistent.

Example: "hand rests on the table beside the cup, camera holds static, no
other motion in frame."
Counter-example: "two hands quickly shuffle a deck of cards in close-up" —
fast motion, heavy self-occlusion, and fine manipulation stacked together,
close to guaranteed to produce fused or extra fingers.
