---
id: handheld-vs-stabilized-stabilized-vocabulary
title: Precise vocabulary for stabilized rigs
category: camera-movement
subcategory: vocabulary
tags: [vocabulary, stabilized, gimbal, dolly]
applicability:
  platforms: [instagram, youtube]
  productTypes: [product-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

"Stabilized" is just as much a scalar as "handheld." Specify the actual rig, and
its residual signature comes along with the name.

- Gimbal glide: buttery lateral or forward movement, near-zero vertical bob;
  used for walk-throughs and slow reveals.
- Dolly on track: perfectly linear push or pull, no lateral drift, mechanical
  precision; the classic feature-film move.
- Slider: short, smooth linear travel, usually under a meter, used for subtle
  parallax across a tabletop or product shot.
- Steadicam: human-operated but mechanically isolated, with a slight low-
  frequency float unlike a gimbal's near-zero motion; used for long unbroken
  following shots.
- Motion-controlled rig: robotic, perfectly repeatable move, used for VFX plates
  and identical multi-take product comparisons.

Why: each rig leaves a distinct residual signature, a gimbal's faint float, a
dolly's linear precision, a Steadicam's slow drift, and naming the rig tells the
model which signature to reproduce. Asking only for "smooth" tends to produce a
move with zero residual motion at all, which is precisely the artifact-free,
frictionless glide that reads as rendered rather than operated.

Example: "slider move, subtle parallax across the product lineup, controlled but
not gimbal-level float-smooth."
Counter-example: "super smooth professional camera movement" — vague enough that
the model renders an impossible zero-noise glide with no rig character.
