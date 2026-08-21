---
id: semantic-token-systems-palette-hue-collision-audit
title: Run a hue-angle audit before locking a semantic token map
category: color-system
subcategory: process
tags: [audit, hue-collision, semantic-color, process]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Before a semantic token map ships, plot every solid-fill token, brand
primary, success, warning, danger, info, and any secondary accent, on a hue
wheel and check the minimum angular gap between any two.

- Convert each token's solid value to HSL and record its hue angle.
- Flag any pair closer than roughly 20 degrees apart as a collision risk,
  closer than that and the two colors become hard to tell apart under
  non-ideal viewing conditions (small size, low brightness, color-deficient
  vision).
- Pay special attention to warning-vs-brand (both frequently orange/amber)
  and info-vs-primary (both frequently blue), the two most common real-world
  collisions.
- Re-run the audit any time a single token changes, a "small" hue nudge to
  fix one pairing can inadvertently create a new collision with a third
  color that was previously fine.
- Do the audit against the actual solid-fill shade used in components, not
  the idealized swatch in a style guide, since implementation often drifts a
  few percent in saturation or lightness from the source file.

Why: hue collisions are easy to miss when colors are reviewed one at a time
in a style guide, each token looks distinct enough in isolation, but the
failure only shows up when two tokens appear near each other in a live
screen, by which point the mistake has already shipped and needs a
coordinated fix across every component that consumes either token. A
five-minute hue-wheel check before launch is far cheaper than a retrofit.

Example: primary at hue 217, danger at hue 0, warning at hue 38, success at
hue 142, info at hue 210, flagged for review since info and primary are only
7 degrees apart, then info is shifted to hue 195 to create separation.
Counter-example: shipping a token map where warning (hue 34) and a
"featured" brand-orange accent (hue 28) sit 6 degrees apart, discovered only
after a support ticket about a promo badge that "looks like an error."
