---
id: skin-tone-and-product-color-accuracy-skin-tone-range
title: Rendering the full range of skin tones accurately
category: color-grading
subcategory: exposure
tags: [skin-tone, diversity, exposure, inclusivity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A prompt that only ever says "person" without describing skin tone defaults to
whatever the model's training distribution over-represents, so accurate
rendering across the full range of human skin tones has to be written in
explicitly, with its own exposure and white-balance handling rather than one
setting applied to every tone.

- State skin tone directly when it matters to the shot ("deep brown skin,"
  "light olive skin," "medium tan skin") instead of leaving it to default.
- Adjust exposure per skin tone: darker skin needs more key-light output or a
  wider aperture to preserve texture and avoid crushing shadow detail to
  black; lighter skin needs highlight control to avoid blowing out.
- Preserve tone-appropriate specular placement — deeper skin holds visible
  highlights at the cheekbone and forehead differently than lighter skin, and
  losing all specular detail reads as a flat cutout.
- Never apply one "beauty" LUT or grade uniformly across a cast with mixed
  skin tones; grade with a mask or a per-subject pass.

Why: lighting and exposure ratios calibrated for one skin reflectance don't
transfer linearly to another, a longstanding problem in film-stock and
digital-sensor history, and generative models inherit the same bias unless
directed otherwise with explicit, tone-specific instruction.

Example: "deep brown skin, key light metered to preserve visible texture and
highlight on the cheekbone, no shadow crush."

Counter-example: applying a single warm, low-key grade built around one skin
tone to an entire cast crushes darker skin to a near-black silhouette while
blowing out lighter skin in the same frame.
