---
id: prompt-length-and-density-one-motion-per-shot
title: One camera move, one subject action, per prompt
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, motion, camera-movement]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A single prompt should carry one camera move and one subject action.
Stacking multiple simultaneous motions is a leading cause of warping and
physically incoherent footage, not merely a density preference.

- Pick one camera behavior: push in, pull out, pan, tilt, static, or handheld
  drift — not two combined, like "push in while panning."
- Pick one subject action: reaching for a cup, not reaching for a cup while
  turning to speak while laughing.
- If a beat genuinely needs two things to happen, that is two shots cut
  together, not one denser prompt.
- The motion budget shrinks as duration or subject count grows: a 4-second
  single-subject clip tolerates more motion complexity than an 8-second,
  three-person clip.

Why: every additional simultaneous motion adds degrees of freedom the model
must resolve frame to frame. Current video models handle compounded motion by
smearing it into motion blur that reads as warping, or by dropping one of the
motions partway through the clip, because the frame budget available for that
duration was never built to resolve several independent trajectories at once.

Example: "Slow push-in on a man reading a letter at a kitchen table, camera
static otherwise."
Counter-example: "Camera pushes in and arcs right while the man stands up,
turns, and reaches for his coat" — three subject motions and two camera
motions layered into four seconds asks for more physical coherence than the
model can hold, and the likely result is a limb that drifts through the coat
rather than gripping it.
