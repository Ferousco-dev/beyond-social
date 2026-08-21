---
id: model-infinitetalk-lipsync-lighting-continuity
title: Keeping light logic consistent as the avatar moves
category: video-prompting
subcategory: avoiding-stillness
tags: [infinitetalk, lighting, continuity, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ad-creative, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

A single light source in the reference photo has to keep behaving like a
single light source once the head starts moving; when shading fails to shift
with head angle, the face reads as pasted onto the motion rather than lit by
one consistent source in a real room.

- State the light's direction and quality in the prompt, not just its
  presence: "soft key light from camera-left, roughly 45 degrees," rather
  than "well lit," which the model can satisfy with flat, directionless
  illumination.
- Keep the described light source singular and motivated: one window, one
  practical lamp, one softbox, rather than an ambiguous even glow that has no
  physical origin for shadows to reference.
- Avoid asking for dramatic head turns beyond what the single light source can
  plausibly still cover; a 45-degree turn away from a hard key light should
  darken that side of the face, and a model that doesn't do this looks flat
  and video-game-lit.
- If the reference has a strong catchlight or rim light, mention it directly
  so the model preserves it as the head tilts, rather than letting it drift or
  vanish.

Why: shading that tracks head angle is one of the strongest physical-realism
cues a face can carry, because it's the visual proof that a specific light is
sitting in a specific place in a real room; flat, angle-independent lighting
is a signature of render shortcuts, not of a photographed subject.

Example: "soft key light from camera-left at roughly 45 degrees, visible
catchlight preserved through head movement, subtle falloff on the shadow
side."

Counter-example: "bright, evenly lit face" with no direction specified, which
the model can satisfy with flat frontal light that never changes no matter how
the head turns, an obvious tell under scrutiny.
