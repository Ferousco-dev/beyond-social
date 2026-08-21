---
id: environment-consistency-across-shots-scale-and-proportion-continuity
title: Anchoring environment scale so geometry doesn't reset between shots
category: video-quality
subcategory: background-continuity
tags: [scale, proportion, continuity, geometry]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

The relative scale of environment elements — furniture size, ceiling height,
doorway proportions — must stay consistent across shots of the same space,
since generative models frequently resize a room's geometry between
independent calls.

The recipe:

- State approximate real-world scale cues in the prompt (door height relative
  to the subject, table height at hip level) instead of leaving proportions to
  the model's guess each time.
- Anchor scale to the subject's body as a measuring stick ("doorway roughly
  one head taller than the subject") and repeat that relationship in every
  shot showing the same doorway.
- Watch wide-to-close cuts especially — a close shot carries fewer geometry
  cues, so carry the established proportions forward in the prompt even when
  they're only partially visible in frame.
- If the set has a distinctive architectural feature (an arched window, a
  specific ceiling height), name its proportion once and keep referencing it
  identically across the scene's shots.

Why: unlike a physical set with fixed measurements, a generative model
rebuilds a room's geometry from the text prompt on every call, so proportion
is not conserved by default. Without an explicit scale anchor, a doorway can
shrink or a ceiling can grow between two shots meant to be the same room,
producing the subtle wrongness of a low-poly video-game set rather than a real
location.

Example: "same doorway, roughly one head taller than the subject, same width
as two shoulder-spans" restated across the establishing shot and the close-up
of the same room.
Counter-example: a wide establishing shot shows a low-ceilinged room, and the
following close-up implies a cathedral-height ceiling with no scale cue given
— the proportions silently reset.
