---
id: skin-tone-and-product-color-accuracy-waxy-oversmooth-skin
title: Avoiding waxy, oversmoothed skin
category: color-grading
subcategory: texture
tags: [skin-texture, oversmoothing, subsurface-scattering, ai-look]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, talking-avatar, ugc, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Overly smooth, poreless skin with a uniform sheen is a top visual tell of
synthetic video, because real skin scatters light beneath the surface
unevenly, and naming texture explicitly is what keeps the model from
defaulting to the plastic look.

- Prompt for visible skin texture: pores, faint under-eye texture, slight
  asymmetry — not "flawless" or "smooth" skin.
- Describe subsurface scattering behavior in terms the model can act on: light
  should soften and redden slightly at ears, nostril edges, and fingertips
  where tissue is thin, not glow uniformly across the whole face.
- Ask for texture to persist through movement; a common failure is skin
  smoothing out only in motion frames even when the first frame looked fine.
- Avoid beauty-filter language entirely ("airbrushed," "porcelain,"
  "flawless"), since these are literal instructions toward the waxy look.

Why: real skin is translucent over a network of capillaries and glands, so
light entering it scatters and re-emerges unevenly; a model trained partly on
retouched photography and 3D renders defaults to uniform reflectance unless
texture and scattering behavior are named as requirements, not left implicit.

Example: "visible skin texture and pores, faint natural sheen only at forehead
and nose, ears reading slightly translucent red in backlight."

Counter-example: "flawless glowing skin" produces a uniform, matte-to-glossy
plastic surface with no pore detail, reading immediately as a beauty filter or
3D render rather than a photographed person.
