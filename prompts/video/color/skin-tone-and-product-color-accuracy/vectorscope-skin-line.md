---
id: skin-tone-and-product-color-accuracy-vectorscope-skin-line
title: Anchor skin tone to the vectorscope skin-tone line
category: color-grading
subcategory: calibration
tags: [vectorscope, skin-tone, calibration, color-accuracy]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

On a vectorscope, correctly balanced skin tone under most lighting falls close
to a fixed hue angle between red and yellow — the "skin tone line" — regardless
of the person's underlying skin tone; deviation off that hue is the fastest way
to catch a bad color cast.

- Different skin tones sit at different distances (saturation/magnitude) from
  center along the same line: deeper skin sits further out, lighter skin
  closer in, but hue angle stays consistent under neutral light.
- If the skin trace rotates toward magenta, the cast is too cool or blue; if it
  rotates toward orange-yellow, the cast is too warm.
- Use the skin-tone line as a sanity check after any grade or LUT pass, not
  only on the raw generation.
- Treat this as a hue check independent of exposure — don't confuse a skin
  tone reading "too dark" with a skin tone reading "wrong hue."

Why: this is a hue-only diagnostic that isolates color cast from both
brightness and the person's actual skin tone, which is why it is the standard
check in professional grading suites rather than judging color on an
uncalibrated preview.

Example: "grade skin tone to sit on the skin-tone vectorscope line; verify no
hue rotation before and after the LUT."

Counter-example: eyeballing skin tone on an uncalibrated preview monitor and
calling it finished — display gamma and ambient room light shift perceived hue
enough to hide a cast the vectorscope would catch immediately.
