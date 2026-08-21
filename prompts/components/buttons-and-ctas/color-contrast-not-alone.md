---
id: buttons-and-ctas-color-contrast-not-alone
title: Button color contrast and not relying on color alone
category: component
subcategory: buttons-and-ctas
tags: [buttons, contrast, accessibility, color]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A button's fill and its label must clear a minimum contrast ratio, and its
meaning must survive being viewed by someone who can't distinguish its color
from a neighboring button at all.

The recipe:

- Text on a filled button needs at least 4.5:1 contrast against the fill for
  normal-weight text (WCAG AA), or 3:1 if the label is large/bold — check this
  against the actual fill color, not the brand swatch it was sampled from,
  since gradients and semi-transparent fills shift the effective ratio.
  Compute against the exact rendered pixel color, not an approximation.
- A button's own outline or fill against the page background also needs 3:1
  contrast (WCAG 1.4.11) so the button is perceivable as a distinct shape,
  independent of its label text.
- Never use color as the only differentiator between button meanings — a
  destructive red and a primary blue button of identical shape and size are
  indistinguishable to roughly 1 in 12 men with red-green color vision
  deficiency. Pair destructive color with a distinct icon, position, or label
  wording.
- Test contrast in both light and dark themes independently; a ratio that
  passes in light mode frequently fails once fills and backgrounds invert.
- Run actual buttons through a contrast checker at build/design-review time,
  not just the base palette — hover and disabled states shift the ratio too
  and need to be checked separately.

Why: contrast requirements exist because "looks fine to me" is not a
reliable test — low vision, glare on a phone screen outdoors, and color
vision deficiency all degrade differently, and a button that only works for
full-contrast, full-color vision fails a predictable fraction of real users.

Example: a red "Delete" button labeled with a trash icon and white text at
4.8:1 contrast, distinguishable even in grayscale.

Counter-example: "Confirm" (green) and "Cancel" (red) buttons, same shape,
same size, no icon or label difference beyond color — unreadable to a
colorblind user and to anyone glancing at a low-brightness screen.
