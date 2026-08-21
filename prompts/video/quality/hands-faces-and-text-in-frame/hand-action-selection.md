---
id: hands-faces-and-text-in-frame-hand-action-selection
title: Choosing hand actions the model can actually render
category: video-quality
tags: [hands, gesture, artifacts, prompting]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Hands fail in generated video in proportion to how many joints are moving and how
fast they move. The fix is upstream of the model: pick an action with a single
clear intent before you write the prompt, not after the render disappoints.

Rules for picking a hand action:

- One hand, one verb: "picks up the mug," not "gestures while explaining and
  reaches for the mug."
- Prefer static-grip actions (holding, resting, pinching a small object) over
  dynamic ones (snapping fingers, typing fast, shuffling cards).
- Keep the hand mostly closed or in simple contact with a surface; open, spread
  fingers in motion are where digit count and joint angles break down.
- If the script needs two hands, stagger them: one holds still while the other
  moves, never both animating at once.
- Cut the shot before the release phase of an action (the let-go, the flick) if
  you don't need it; the release is where models most often lose finger topology.

Why: video diffusion models learn hand geometry as a low-frequency prior next to
faces and rigid objects, because hands appear in training data with huge pose
variance and frequent occlusion. Every additional joint in motion multiplies the
chance the model's temporal consistency breaks between frames, so simplifying
the verb is the highest-leverage lever available before any post-fix.

Example: "a hand rests on a ceramic mug on the counter, thumb along the rim, still."
Counter-example: "hands chopping vegetables rapidly, fingers curling around the
knife handle while gesturing to camera" — two dynamic multi-joint actions at once
guarantees warped fingers and a knife that phases through the hand.
