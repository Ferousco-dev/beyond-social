---
id: semantic-token-systems-contrast-pairing-fill-vs-tint
title: Verify contrast separately for tint and solid semantic pairings
category: color-system
subcategory: accessibility
tags: [contrast, accessibility, semantic-color, wcag]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Every semantic color gets used in at least two contrast pairings, text on a
light tint background, and white or near-white text on the solid fill, and
each pairing needs its own WCAG check because passing one does not guarantee
the other passes.

- Check `-fg` text against `-bg` tint at 4.5:1 for body text, 3:1 acceptable
  only for large text or icons.
- Separately check white (or the token used for on-color text) against
  `-solid` at 4.5:1 for button and badge labels.
- Amber and light-tinted yellows are the most common failure: a warning
  amber that passes as a border or icon color frequently fails as a solid
  button fill with white text, the fix is usually darkening `-solid` two or
  three steps, not changing hue.
- Re-run the check after any rebrand or palette refresh; shifting the base
  hue by even 5-10 degrees can silently break a pairing that used to pass.

Why: teams routinely test the friendly, high-lightness tint version of a
semantic color and assume the more saturated solid version inherits the same
accessibility, but lightness and saturation both move independently when a
color is intensified for a filled button, so contrast has to be re-verified
at each usage, not assumed from a single spot check.

Example: `--warning-solid: #B45309` (darkened from the display-friendly
`#F59E0B`) used specifically for filled warning buttons with white text, to
hit 4.5:1, while `#F59E0B` stays reserved for icons and borders where it
already passes.
Counter-example: shipping a single `--warning: #F59E0B` used both as an icon
color and as a solid button fill with white label text, where the button
fails contrast checks but nobody tested that specific pairing.
