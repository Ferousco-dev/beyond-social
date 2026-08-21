---
id: model-seedance-negative-prompting
title: What Seedance's negative prompt field actually suppresses
category: video-prompting
subcategory: model-seedance
tags: [seedance, negative-prompt, artifacts, quality-control]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

The negative prompt field is for ruling out specific recurring failure modes,
not for pushing the shot toward a positive style. It works as a filter on the
model's own known weak spots, and vague negatives waste it.

The recipe:

- Use it for known failure categories: "extra fingers, warped hands, distorted
  text, morphing logo, flickering, duplicate limbs."
- Use it defensively for anything the reference image contains that shouldn't
  animate: "no camera shake" when a locked-off shot is wanted despite ambient
  motion described elsewhere in the prompt.
- Don't put style preferences in the negative prompt ("no bad lighting," "not
  ugly") — these aren't concrete artifact classes, so they have little to no
  measurable effect on output.
- Keep it short: a long negative list dilutes the weight of each term, so lead
  with whatever artifact has actually recurred in prior generations of that
  scene.

Why: the negative prompt operates as a suppression signal against specific
learned failure patterns, not as inverse-style guidance, so it only has
traction on things the model can recognize as a discrete artifact class.
Abstract quality complaints have no corresponding pattern to suppress.

Example negative prompt: "warped hands, extra fingers, morphing face,
distorted logo text, motion blur smear."

Counter-example: "ugly, bad quality, boring, not cinematic" — none of these
name a concrete artifact, so the negative prompt does effectively nothing.
