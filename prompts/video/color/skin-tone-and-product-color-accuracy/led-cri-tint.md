---
id: skin-tone-and-product-color-accuracy-led-cri-tint
title: Low-CRI LED tint casts on skin and product color
category: color-grading
subcategory: lighting
tags: [cri, led-lighting, tint, skin-tone]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [ugc, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Low color-rendering-index LED sources push skin and product color toward a
green or magenta tint that a viewer feels as "off" without being able to name
it, so describing the light source's quality, not just its color temperature,
matters for accurate rendering.

- When the scene light is LED, a common real-world source now, note it
  explicitly and pair it with a correction cue: "high-CRI LED, corrected for
  green tint," rather than leaving LED's default spectral gaps unaddressed.
- Watch skin specifically for a sickly green undertone in shadow areas and a
  magenta cast in the brightest skin highlights, the two classic low-CRI
  failure directions.
- For product shots, low CRI most visibly distorts saturated reds and deep
  blues, shifting them muddy even when overall white balance reads correct.
- For UGC-style shots using practical LED panels or ring lights, describe them
  as "high-CRI" or "color-accurate" sources rather than generic "LED light,"
  since real cheap LEDs are the ones that cause this problem.

Why: CRI measures how completely a light source's spectrum covers the visible
range; cheap LEDs are spiky rather than continuous, so they render some hues,
especially deep reds and skin's sub-surface reds, inaccurately even when their
overall correlated color temperature reads correctly on a meter, which is why
two "5600K" sources can still look different on skin.

Example: "lit with high-CRI LED panel, accurate skin rendering with no green
undertone in shadow."

Counter-example: "ring light setup" with no CRI or quality note risks the
model defaulting to the greenish, flat cast typical of consumer ring lights,
most visible in shadow-side skin.
