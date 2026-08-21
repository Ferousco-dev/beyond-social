---
id: negative-prompting-camera-drift
title: Excluding unmotivated floating camera movement
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, camera, motion, cinematography]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Generated video has a default camera behavior: a slow, weightless drift with
no clear rig behind it, gliding rather than being pushed, panned, or held.
Every real camera move has physical provenance, a dolly on track, a gimbal
operator's footsteps, a handheld breath, and the absence of that provenance is
what makes the "floating camera" read as synthetic.

What to exclude, and the rig vocabulary to specify instead:

- Exclude "smooth floating camera, drifting camera, weightless camera motion"
  as literal terms, since "smooth" alone is not the problem, ungrounded
  smoothness is.
- Replace with a named rig and its actual physical signature: "handheld,
  slight vertical bob matching footsteps" or "dolly push on track, minor
  start/stop hesitation" or "static tripod, no camera movement."
- Exclude "camera moves through solid geometry," the tell that the move was
  never validated against a physical rig path (through a doorway too narrow
  for a body, past a wall with no gap).
- For handheld looks specifically, exclude "perfectly stabilized handheld,"
  since real handheld carries continuous micro-correction, not gimbal-smooth
  stillness.

Why: viewers do not consciously reason about rigs, but they have seen enough
real camera operators' actual movement that a floating, physically ungrounded
glide registers as wrong even without being named; tying every move to a real
rig's physical constraints closes that gap.

Example: "handheld camera, slight shake on footsteps, operator breathing
visible in minor frame sway."
Counter-example: "smooth cinematic camera glide through the space" with no rig
specified, which is exactly the phrasing that produces the floating-camera
artifact.
