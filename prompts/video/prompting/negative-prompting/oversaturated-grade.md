---
id: negative-prompting-oversaturated-grade
title: Excluding the oversaturated, HDR-glow default grade
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, color-grade, saturation, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Unprompted generations tend toward an oversaturated, high-contrast grade with
a slight glow lifted off highlights, closer to an HDR display demo reel than
footage off a real sensor. Real camera footage, even graded footage, is
constrained by a sensor's actual dynamic range and a colorist's restraint.

What to exclude and the grading vocabulary to specify instead:

- Exclude "oversaturated, HDR glow, blown-out highlights with bloom, neon-
  intensity color" as literal terms rather than "not too colorful."
- Specify an actual reference look instead of just subtracting: "log-flat
  base grade with a single warm LUT, highlights rolled off not clipped."
- Exclude "every color channel pushed to maximum saturation simultaneously,"
  the specific tell of an ungraded default rather than a deliberate palette
  choice, since real grades usually push one or two colors and let the rest
  sit closer to neutral.
- For skin specifically, exclude "oversaturated red/orange skin tone," a
  common side effect of a global saturation push that a colorist would
  isolate and correct with a power window.

Why: a colorist's job is selective, pushing specific hues while protecting
skin tone and highlight detail; a uniform global saturation boost is what
happens with no selective grading applied at all, and viewers who have seen
real graded footage register that uniformity as artificial even without being
able to name it.

Example: "log-flat base, single warm color cast in shadows only, skin tones
protected and left closer to neutral."
Counter-example: "vibrant, punchy, high-saturation colors, dramatic HDR
look" — a request for the default oversaturation, phrased as a style note.
