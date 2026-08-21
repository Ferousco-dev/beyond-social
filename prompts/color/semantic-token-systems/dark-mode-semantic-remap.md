---
id: semantic-token-systems-dark-mode-semantic-remap
title: Remap semantic colors per theme instead of reusing light-mode values
category: color-system
subcategory: theming
tags: [dark-mode, semantic-color, theming, tokens]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Semantic colors are theme-dependent values, not constants; the light-mode
danger red will look dull on a light surface and either muddy or
uncomfortably neon on a dark one if it is reused unchanged.

- For dark surfaces, raise the lightness and slightly reduce the saturation
  of each semantic solid, a saturated `#DC2626` that reads clearly on white
  can look either muddy or vibrate uncomfortably against near-black.
- Tint backgrounds (`-bg`) in dark mode should be a small lightness step up
  from the base surface, not a literal alpha-blended version of the light
  tint, which often turns a chalky, low-contrast gray-red.
- Re-verify every contrast pairing (fg-on-bg, on-color-on-solid) independently
  in dark mode; a pairing that passed in light mode has no guarantee in dark.
- Define both theme maps in the same token file, indexed by role, so a
  reviewer can see light and dark values for "danger" side by side and catch
  an inconsistency at a glance.

Why: perceptual lightness and chroma both read differently against black
than against white, a color tuned only for light backgrounds is being asked
to do a job it was never validated for. Teams that skip this step usually
find out via a support ticket or a screenshot where the dark-mode error
state looks like a rendering bug rather than a deliberate design.

Example: light-mode danger solid `#DC2626`, dark-mode danger solid `#F87171`,
both independently verified for contrast against their respective surfaces.
Counter-example: a `prefers-color-scheme: dark` block that only swaps
background and text tokens while every semantic status color stays fixed at
its light-mode hex value, producing a washed-out, low-contrast error badge on
the dark surface.
