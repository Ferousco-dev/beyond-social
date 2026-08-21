---
id: reference-image-conditioning-first-vs-last-frame
title: First-frame-only vs first-and-last-frame control
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, first-frame, last-frame, keyframes]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Single first-frame conditioning gives the model freedom to invent the middle and the
ending, which produces livelier motion; first-and-last-frame conditioning locks a
specific outcome but tends to produce flatter, more mechanical interpolation between
the two points. Choose based on whether the shot's value is in the journey or the
destination.

- Use first-frame-only when the win is a natural, unscripted-feeling move (a hand
  picking up a cup, a head turning) and you want the model's own motion prior to
  drive it, not a forced arc.
- Use first-and-last-frame when the deliverable requires a specific end state
  (product fully revealed, logo assembled, text legible) that a random walk from
  one frame won't reliably hit.
- When using both frames, keep the interval short and the compositional change
  modest; large jumps force the interpolator into unnatural intermediate poses to
  "catch up."
- Never treat the last frame as a second independent prompt; describe the
  transition in the text, not just the two anchors.

Why: image-to-video models treat a last frame as a hard constraint to satisfy by
a fixed time budget, so the further the two frames are apart in pose, lighting, or
camera position, the more the in-between motion has to compress or rush, which
reads as unnatural speed ramping rather than intentional camera work.

Example: "first frame: hand near cup handle. last frame: hand lifted with cup at
mouth height. describe: unhurried single continuous lift, wrist rotates naturally."

Counter-example: prompting a last frame with the subject in a completely different
location and pose than the first frame ("first frame: sitting at desk, last frame:
standing at window across the room") and expecting a believable walk cycle in three
seconds, the model will teleport-blur through it.
