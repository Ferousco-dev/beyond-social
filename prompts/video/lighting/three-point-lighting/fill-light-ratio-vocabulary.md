---
id: three-point-lighting-fill-ratio-vocabulary
title: Fill light and the key-to-fill ratio
category: lighting
subcategory: three-point
tags: [fill-light, contrast-ratio, key-to-fill, three-point]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, talking-avatar, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Fill light does not add its own shape; it only raises or lowers how dark the
key's shadow side gets. The key-to-fill ratio, not the fill's presence alone,
is what should be specified, because that number is what actually reads as mood.

- 2:1 (fill nearly matches key): low-contrast, commercial, beauty and skincare,
  reads as bright and safe.
- 4:1: a visible but soft shadow side, the standard "cinematic but likeable"
  ratio for talking-head and lifestyle content.
- 8:1 or higher: the shadow side goes near-black, dramatic and premium, but
  risks losing detail on darker skin tones if pushed too far without a touch
  of fill.
- Describe the fill as a source, not a glow: "soft bounce fill from
  camera-right" reads as physical; "some fill light" reads as nothing and gets
  ignored.
- Skip fill entirely (key light only) for a deliberately harder, more raw look;
  say so explicitly rather than omitting it and hoping.

Why: naming a ratio gives the model a relationship between two lights instead
of two independent brightness values, which is what actually produces a
believable falloff across the face rather than a uniformly lit mask.

Example: "key light camera-left, soft fill from camera-right at roughly a 4:1
ratio, visible but gentle shadow on the far side of the face."
Counter-example: "add some fill light so it's not too dark" — no ratio, no
direction, so the model either ignores it or over-fills back to flat.
