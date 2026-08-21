---
id: troubleshooting-common-failures-moire-and-fine-pattern-strobing
title: "Symptom: fine repeating patterns strobe, shimmer, or crawl"
category: video-quality
subcategory: troubleshooting-common-failures
tags: [moire, flicker, pattern, aliasing, texture]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Symptom: fine, regularly repeating detail — a herringbone jacket, window
blinds, a mesh screen, closely spaced roof tiles, a checkerboard tile floor —
visibly shimmers, crawls, or strobes between frames instead of sitting still.
This is a moiré-like aliasing failure: the pattern's frequency is near the
limit of what the model can resolve consistently frame to frame.

- Avoid fine, high-frequency repeating patterns in wardrobe, backgrounds, and
  props altogether when the shot allows a substitute: a solid or
  large-scale-print shirt instead of fine houndstooth, a plain wall instead
  of narrow venetian blinds.
- If the pattern is unavoidable (a brand's signature material, a real
  location), keep it out of sharp focus or keep the camera further back so
  the pattern's on-screen frequency drops below the strobing threshold.
- Slow any camera or subject movement across the pattern; strobing is a
  temporal problem, and slower relative motion gives the model more
  frame-to-frame continuity to hold onto.
- Prefer soft, diffused light over hard specular light on textured or
  patterned surfaces; hard light exaggerates the edges the model struggles to
  hold steady, while soft light lowers the effective contrast of the pattern.
- Treat this the same way a real DP treats moiré on camera: it's a known
  optical limitation to shoot around, not a note to fix in the prompt with
  more detail. More described detail on a fine pattern makes it worse, not
  better.

Why: temporal aliasing happens when a pattern's spatial frequency is close to
what the model's frame-to-frame consistency can track; the fix is the same
one working DPs use on real cameras with moiré-prone fabric, shift the
pattern's scale, focus, or distance rather than fighting the artifact directly.

Example: "solid charcoal blazer, softly lit, camera holds steady."
Counter-example: "fine pinstripe suit under hard studio light, camera
slowly panning across him" — pattern, hard light, and motion compound the
strobe.
