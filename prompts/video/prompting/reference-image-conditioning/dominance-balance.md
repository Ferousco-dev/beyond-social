---
id: reference-image-conditioning-dominance-balance
title: Deciding whether the image or the text owns each attribute
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, prompt-weighting, control-balance]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

The reference image and the text prompt compete for control, and treating them as
equally authoritative is the most common cause of muddy output; decide up front
which one owns each attribute of the shot.

- Let the image own: composition, wardrobe, exact colors, product geometry,
  face and identity, existing lighting direction.
- Let the text own: what happens next, camera movement, pacing, atmosphere
  changes (weather, time passage), anything not visible in a still.
- Never restate in text what's already true in the image; redundant description
  just gives the model two slightly different targets to reconcile, and it
  averages them into something duller than either.
- When text and image genuinely disagree (image is daylight, prompt wants dusk),
  expect a fight the model usually loses gracefully but visibly; either commit
  the change gradually within the shot or start from a reference that already
  matches the target lighting.

Why: reference-conditioned video models are trained to preserve pixel-level
structure from the input frame while text steers a temporal delta; asking the
text to override a strong visual attribute in the image forces the model to
choose between fidelity to the reference and obedience to the prompt, and it
hedges, producing a shot that looks like neither.

Example: image shows a red kettle on a marble counter, prompt: "steam begins
rising, camera pushes in slowly" — no color or object restatement needed.

Counter-example: "a red kettle on a marble counter, steam rising, camera pushes
in" as the full prompt for an image that's already a red kettle on marble; the
redundant clauses do nothing but dilute the one clause (steam) that actually
needed to land.
