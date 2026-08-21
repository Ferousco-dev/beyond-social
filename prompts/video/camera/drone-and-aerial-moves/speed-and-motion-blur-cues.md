---
id: drone-and-aerial-moves-speed-and-motion-blur-cues
title: Cuing perceived speed with motion blur, not raw velocity
category: camera-movement
subcategory: aerial
tags: [drone, motion-blur, speed, aerial]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Perceived speed in aerial footage comes from motion blur and near-field streaking,
not from raw velocity, and a generated shot needs this cued explicitly or a fast move
reads as an unconvincing slow float regardless of the ground it covers.

- For any aerial move meant to feel fast, specify motion blur or streaking on
  near-foreground elements, tree tops, wave crests, passing close to the lens.
- Keep the horizon and far background comparatively sharp and slow-moving; blur
  belongs to what's close, not applied evenly across the whole frame.
- Pair fast lateral moves with a slight frame shake or roll; real fast flight is
  never perfectly smooth.
- For a genuinely fast pass, keep the shot brief, roughly 1.5-2.5 seconds. A long
  "fast" shot that stays smooth the entire time reads as sped-up footage rather than
  an actually fast flight.

Why: the visual system judges speed largely from how quickly near objects change
position relative to the frame edge, the same reason a train feels faster from a
trackside seat than from a hilltop overlook. A wide, evenly-sharp, perfectly smooth
aerial shot doesn't register as fast no matter what speed is stated in the prompt,
because none of the cues the brain actually uses for speed are present in the frame.

Example: "low fast pass over the surf break, whitewater and rocks blurring past in
the foreground, horizon line comparatively steady, slight camera shake on the fastest
section."

Counter-example: a "high speed" aerial pass rendered perfectly smooth and evenly
sharp throughout the frame. It reads as a slow, floaty move no matter how much
ground it actually covers.
