---
id: pairing-and-scale-systems-fluid-scale-clamp
title: Fluid type scales with clamp
category: typography
subcategory: pairing-and-scale-systems
tags: [typography, scale, responsive, css]
applicability:
  platforms: [web]
  productTypes: [landing-page, marketing-site, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A modular scale defined in fixed pixel steps breaks at extreme viewport
widths, headlines that look right at 1440px overflow or shrink to nothing at
375px or 2560px; a fluid scale interpolates each step between a minimum and
maximum instead of jumping at breakpoints.

- Define each level as clamp(min, preferred-vw, max), for example clamp(1.75rem,
  1.4rem + 1.5vw, 3rem) for an H1.
- Keep the vw coefficient small for body text (0.2 to 0.4vw) so it barely
  moves, and larger for display sizes (1 to 2vw) where the drama is wanted.
- Still derive the min and max from the same modular ratio; fluid interpolation
  replaces the breakpoint jumps, it doesn't replace the underlying scale logic.
- Test at true extremes, 320px and 2560px, not just the two or three
  breakpoints in the design file, since clamp has no breakpoints to hide
  behind.

Why: real viewports form a continuum, not four fixed sizes. A scale that only
defines values at breakpoints either wastes space at in-between widths or
produces a visible snap when the breakpoint fires, while clamp keeps size
proportionate to the actual viewport at every width in between.

Example: "h1 { font-size: clamp(2rem, 1.6rem + 2vw, 3.5rem); }" scales smoothly
from mobile to ultrawide off a single line.

Counter-example: three fixed font-size values in media queries at 640px,
1024px, and 1440px, leaving a visible jump in headline size exactly at each
breakpoint and no scaling at all beyond 1440px.
