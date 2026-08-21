---
id: dark-mode-design-semantic-color-remapping
title: Semantic status colors need independent dark-mode remapping
category: color-system
subcategory: dark-mode-design
tags: [dark-mode, semantic-color, status, accessibility]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Success green, error red, warning amber, and info blue each have a different
"safe zone" of lightness where the hue still reads correctly and passes
contrast — those zones are not the same across colors, so remapping all four
by the same formula produces at least one that misfires.

- Tune each semantic hue individually against its dark surface: green tends
  to need a lightness lift to avoid reading as murky olive; red needs a
  slight desaturation to avoid vibrating; amber/yellow needs the most
  restraint since bright yellow on dark is one of the highest-fatigue
  combinations available.
- Keep a fixed pairing between a status color and its background tint (e.g.
  error text `#F87171` paired with background tint `rgba(248,113,113,0.12)`)
  so status chips and inline text always agree with each other.
- Run each semantic color through a contrast check against every surface
  level it might appear on (surface-0 through surface-3), not just the page
  background, since a badge inside a modal sits on a lighter surface than a
  badge on the base page.
- Do not let two semantic hues converge in dark mode even if they were
  visually distinct in light mode — check them side by side, since darkening
  can make a warning amber and an error red look closer in value than they
  did on white.

Why: hue, saturation, and lightness interact non-linearly with perceived
color and legibility, so there is no single multiplier that correctly ages a
whole palette from light to dark — each semantic color needs its own pass,
the same way a colorist grades skin tones and sky separately rather than one
global curve.

Example: dark-mode success `#4ADE80` on tint `rgba(74,222,128,0.12)`, warning
`#FBBF24` used sparingly and never as full-width fill.

Counter-example: applying one "reduce lightness by 20%, increase saturation by
10%" transform uniformly to all four status colors — the warning and error
colors end up nearly indistinguishable at a glance.
