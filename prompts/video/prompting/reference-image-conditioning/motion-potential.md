---
id: reference-image-conditioning-motion-potential
title: Choosing references with motion already latent in them
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, reference-selection, kinetic-energy, casting]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A reference image shot as a static hero pose animates worse than one caught
mid-action, because the model has nothing to extrapolate from a subject that's
already at rest in a "finished" pose.

- Prefer references with an off-balance or transitional moment: weight shifting
  onto one foot, a hand already moving toward an object, fabric or hair not yet
  settled.
- Avoid catalog-style symmetric poses (both feet planted, hands at sides,
  direct-to-camera stare) as your only reference; they read as a photo that then
  starts moving rather than a frame lifted from motion.
- If the source library only has static poses, pick the one with the most
  asymmetry (weight on the back foot, chin slightly turned, one shoulder dropped)
  over the most "correct" one.
- For product shots, a hand or arm already entering frame gives the model a
  motion vector to continue; an isolated product on white has none.

Why: video models infer velocity from cues like blur direction, weight
distribution, and unsettled cloth or hair within the reference; a perfectly
balanced, static pose carries zero motion information, so the model has to
invent movement from nothing, and it defaults to the safest, most generic
option, usually a slow zoom or gentle sway, regardless of what the text asks
for.

Example: reference shows a barista mid-pour, wrist angled, liquid arcing, apron
swinging slightly — text just needs "pour continues, camera holds."

Counter-example: reference is a model standing perfectly still, arms symmetric,
facing camera dead-on, then prompting "walks confidently toward camera"; the
model has no weight-shift cue to build a gait from and produces a sliding,
foot-skating walk.
