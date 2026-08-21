---
id: three-point-lighting-key-light-angle-and-quality
title: Key light angle and quality
category: lighting
subcategory: three-point
tags: [key-light, angle, hardness, three-point]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, talking-avatar, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

The key light is the dominant source and does the most work of any light in the
scene; its angle and hardness alone determine whether a face reads as sculpted
or flat. Specify both, never just "well lit."

- Angle: start at roughly 30-45 degrees off the camera-subject axis, and 30-45
  degrees above eye line. This is the classic starting point that carves a nose
  shadow and cheek shadow without going full profile-split.
- Hardness: name the source size relative to the subject. "Large softbox close
  to the face" reads as soft, wrapping light with a slow shadow transition.
  "Bare bulb" or "small hard source" reads as a crisp-edged, dramatic shadow.
- State distance: a key light close to the subject falls off fast (background
  goes darker), a key light far away is more even across the scene. Falloff is
  a realism cue, not a flaw.
- Only one key. A second "key-strength" source from another angle reads as
  flat, shadowless, artificial light with no logic.

Why: the model has no innate sense of a light rig, so a described angle and a
described source size are the only levers that produce a real shadow shape
instead of default frontal flood lighting, which is the single most common
"generated video" tell.

Example: "key light at 40 degrees camera-left, large soft source close to the
face, soft shadow falloff across the far cheek."
Counter-example: "bright, evenly lit face" — no angle, no source size, so the
model defaults to flat, shadowless front light that reads as synthetic.
