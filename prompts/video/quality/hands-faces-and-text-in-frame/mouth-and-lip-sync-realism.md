---
id: hands-faces-and-text-in-frame-mouth-and-lip-sync-realism
title: Mouth shapes and lip-sync for talking footage
category: video-quality
tags: [faces, lip-sync, mouth, talking-avatar]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, short-form-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Mouth movement is judged against audio the viewer already understands, which makes
even small timing or shape errors far more visible than an off finger or a soft
background detail; treat lip accuracy as the highest-priority face element on any
talking shot.

Working rules:

- Keep sentences short per shot (roughly 3-6 seconds of continuous speech) rather
  than one long unbroken take; sync drift compounds the longer a single continuous
  mouth-movement segment runs.
- Favor front-facing or near-front-facing angles for dialogue; sync accuracy
  degrades faster off-axis because visemes (the visual mouth shapes for sounds)
  are least distinct in profile.
- Keep the jaw and cheeks visible and unobstructed, no hand-near-face gestures,
  no hair falling across the mouth during a speaking beat.
- Avoid asking for big, exaggerated mouth movements in the prompt; naming a
  natural, moderate articulation reads more accurately than "expressive," which
  tends to overshoot into rubbery, over-wide mouth shapes.
- If the platform's pipeline supports a separate lip-sync pass after generation,
  generate the base performance with a closed or resting mouth in non-speaking
  beats and let the dedicated sync step own the speaking segments; asking one
  general-purpose generation to do both increases drift.

Why: humans lip-read unconsciously as part of speech comprehension, so audio-visual
mismatch registers as wrongness almost instantly, well before a viewer could
articulate what's off, unlike a background artifact that only alert viewers notice.

Example: "front-facing, moderate natural mouth movement, one sentence per shot,
face and jaw fully unobstructed."
Counter-example: "profile angle, exaggerated animated mouth movement, 20 seconds
of continuous dialogue in one take" — the angle, the exaggeration, and the length
each independently increase visible sync drift, and they compound together.
