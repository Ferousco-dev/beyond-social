---
id: model-veo3-camera-verb-vocabulary
title: Use crew camera terms, not mood words, for movement
category: video-prompting
tags: [camera, syntax, movement, cinematography]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.92
---

Veo 3 responds most reliably to camera language borrowed from real crew
terminology (dolly, pan, tilt, truck, crane, handheld, static) rather than
editorial description of the resulting feeling, like "dynamic camera
movement."

Practice:

- Name the rig and the move together: "slow dolly-in," "handheld with slight
  sway," "static tripod shot," "crane rising over the subject."
- Distinguish pan and tilt (the camera pivots in place) from truck and dolly
  (the camera physically moves through space): these produce visibly
  different parallax, and the model treats them as different instructions
  when named correctly.
- Pair every movement with a speed and a direction: "slow push-in," "quick
  whip pan left." A bare verb with no pace defaults to a medium, often
  over-smooth, move.
- Limit one 8-second clip to a single primary camera move. Stacking "dolly in
  while craning up while panning right" divides the motion budget three ways,
  and each move reads weaker for it.

Why: these terms exist because they map to distinct physical rig behaviors
with distinct visual signatures (parallax versus pure rotation, motivated
versus floaty movement), and the model has seen them paired with matching
footage in training. Mood-based camera language ("dynamic," "epic") has no
consistent physical referent to anchor to, so it defaults to generic drift.

Example: "Slow dolly-in on the runner's face as she crosses the finish line,
camera at eye level, no pan."
Counter-example: "dynamic, cinematic camera movement." No rig, no direction,
no speed; produces an unpredictable, often overly smooth default move.
