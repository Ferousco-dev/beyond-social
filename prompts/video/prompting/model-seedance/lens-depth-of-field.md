---
id: model-seedance-lens-depth-of-field
title: Lens and depth-of-field language Seedance responds to
category: video-prompting
subcategory: model-seedance
tags: [seedance, lens, depth-of-field, optics]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Naming an actual focal length and aperture-driven depth of field gives Seedance
a consistent optical signature to hold across the shot, rather than the flat,
everything-in-focus look it tends to default to.

The recipe:

- Specify focal length in cinematography terms: "35mm lens" for a natural,
  documentary field of view, "85mm" for a compressed, shallow portrait look.
- Pair depth of field with a reason: "shallow depth of field, background
  dissolves into soft bokeh" holds up more reliably than "blurry background"
  alone.
- For product or macro shots, request focus racking explicitly if wanted:
  "focus pulls from the label to the liquid inside" — otherwise the model
  tends to keep a single static focal plane for the whole shot.
- Avoid combining wide-angle language ("fisheye," "ultra-wide") with a request
  for flattering close-up portraiture — wide lenses distort faces in ways that
  read as an artifact, not a stylistic choice, at close range.

Why: focal length and aperture are physical camera-department parameters with
well-documented visual signatures in the training footage, so naming them gives
the model a specific optical formula to apply consistently. Generic blur
language instead gets treated as a post-effect layered inconsistently over an
otherwise flat image.

Example: "Shot on an 85mm lens, shallow depth of field, the barista sharp in
focus while the espresso machine behind her dissolves into warm bokeh."

Counter-example: "Blurry background, in focus subject" — with no lens or cause
specified, the blur often appears patchy or inconsistent frame to frame instead
of behaving like real optical falloff.
