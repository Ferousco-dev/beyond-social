---
id: dark-mode-design-gradient-banding
title: Dark gradients band visibly and need dithering or noise to hide steps
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, gradient, banding, dither]
applicability:
  platforms: [web, mobile]
  productTypes: [marketing-site, landing-page, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

A smooth gradient between two dark, close-in-value colors is far more likely
to show visible banding (discrete steps instead of a smooth ramp) than the
same gradient in light mode, because the eye is more sensitive to small
luminance differences at low overall brightness, and 8-bit color depth has
fewer distinct steps available in the dark end of the range.

- Add a low-opacity noise/grain texture (1-3% opacity fine grain) over any
  large dark gradient area — hero backgrounds, card fills — to break up
  banding perceptually even where the underlying values still step.
- Prefer gradients that span a wider hue or lightness range rather than a
  narrow one; a gradient from `#0a0a0c` to `#141418` bands more than one from
  `#0a0a0c` to `#2a2a30` because the wider range spreads the same number of
  steps further apart.
- Export and serve gradient-heavy images at higher bit depth when the
  pipeline allows it (16-bit intermediate, dithered on export to 8-bit)
  instead of relying on the browser or app to dither an 8-bit source.
- Test on an actual OLED or high-contrast display, not just a color-managed
  design monitor — banding that's invisible in Figma is often obvious on the
  devices users actually carry.

Why: perceptual sensitivity to luminance difference follows a roughly
logarithmic curve (Weber-Fechner), so equal numeric steps in RGB values are
not equally visible — the same delta is much more noticeable near black than
near white. Dark-mode gradients are operating in exactly the range where
banding is most perceptible, which is why techniques largely unnecessary in
light mode become necessary here.

Example: hero background gradient `#0b0d10 → #1e2530` with a 2% opacity noise
overlay (`mix-blend-mode: overlay`) applied on top.

Counter-example: a narrow-range gradient `#0a0a0a → #101010` exported as a flat
8-bit PNG with no dithering — visible horizontal banding across the hero on
most phone screens.
