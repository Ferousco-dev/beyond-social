---
id: skin-tone-and-product-color-accuracy-lut-uniform-distortion
title: LUTs distort skin tone when applied without protection
category: color-grading
subcategory: luts
tags: [lut, color-grading, skin-tone, secondary-correction]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A cinematic LUT applied globally shifts skin the same amount it shifts
everything else in the frame, but skin needs to be the one thing that moves
the least, so any stylized grade needs a skin-protection step rather than a
single uniform pass.

- Apply the creative LUT, then pull a secondary, hue-limited correction back
  on just the skin-tone range to restore it toward neutral before finalizing.
- Prefer LUTs and grades built with a "skin tone protect" pass or vectorscope
  check over one applied blind for mood.
- When prompting a look directly ("teal and orange," "moody desaturated,"
  "warm vintage film"), pair it with an explicit exception: "skin tone stays
  natural," so the stylization is understood to exclude faces.
- Re-check the vectorscope skin-tone line after any LUT, since this is exactly
  the step a uniform pass skips.

Why: LUTs are 3D color transforms across the entire gamut and don't know which
pixels are a face, so a look aggressive enough to feel cinematic on a sky or a
set piece pushes skin just as aggressively toward that look's shadow and
midtone hue shift, which is why professional grading always treats skin as a
protected, separately keyed region rather than part of the global look.

Example: "teal-and-orange color grade applied to background and shadows, skin
tone pulled back to neutral with a secondary correction."

Counter-example: applying a heavy teal-orange LUT with no skin exception turns
every face green-teal in the shadows and orange in the highlights, the single
most common amateur color-grading mistake.
