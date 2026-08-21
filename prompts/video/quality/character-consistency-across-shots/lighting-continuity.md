---
id: character-consistency-across-shots-lighting-continuity
title: Match key light direction and color temperature across shots
category: video-quality
subcategory: character-consistency
tags: [character-consistency, lighting, continuity, cinematography]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Identity read is partly a lighting problem, not just a geometry problem: the same
face lit from a different direction with a different color temperature can look
like a different person, especially in close-up. Coverage of one scene needs one
consistent lighting setup described the same way in every shot's prompt.

The recipe:

- Fix key light direction relative to the character (camera-left, roughly 30-45
  degrees off-axis, coming from window height) and state it the same way in every
  shot prompt for that scene.
- Fix color temperature in words the model can hold onto: "warm 3200K tungsten,"
  "cool overcast daylight," not "nice lighting."
- Keep fill ratio described consistently too (soft fill, minimal shadow fill, or hard
  contrast with deep shadow) since a swing from soft to hard fill changes how the
  bone structure reads even with identical geometry.
- Only change the lighting description when the scene's story logic changes it (a
  character walks from outdoors into a dim room); state that change explicitly rather
  than letting it happen as an accident of a new generation.
- Treat practicals mentioned in frame (a lamp, a window) as fixed set dressing that
  should reappear in the same position across the scene's shots.

Why: lighting direction changes which planes of the face catch highlight and which
fall into shadow, and that shifts perceived cheekbone height, jaw width, and eye
socket depth enough that a viewer's face-recognition system reads it as a different
person, even when the underlying prompt geometry hasn't changed at all.

Example: "key light from camera-left, 40 degrees off-axis, warm 3200K, soft fill"
repeated across every shot of the scene.
Counter-example: shot one lit with soft warm window light, shot two lit with hard
cool overhead light, same character prompt otherwise — the face reads differently.
