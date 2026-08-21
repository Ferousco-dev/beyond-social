---
id: pairing-and-scale-systems-density-modes
title: Comfortable and compact density modes
category: typography
subcategory: pairing-and-scale-systems
tags: [typography, scale, density, dashboard]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A type scale should ship in at least two density modes, comfortable for
marketing surfaces and compact for data-dense product surfaces, with the ratio
and the accompanying spacing scale changing together, not just the base size.

- Comfortable mode: ratio 1.25 to 1.333, base 16 to 18px, line-height 1.5 to
  1.6, generous vertical rhythm between blocks (24 to 32px).
- Compact mode: ratio 1.125 to 1.15, base 13 to 14px, line-height 1.35 to 1.45,
  tight vertical rhythm (8 to 16px) so tables and lists don't waste vertical
  space.
- Keep both modes on the same underlying spacing unit (a 4px base) so
  components built for one mode don't misalign when reused in the other.
- Treat density as a token swap, a data-density attribute or theme variant,
  not a one-off override on individual components, so a settings table and a
  marketing pricing table can share components but read at the right density
  for their context.

Why: the density that makes a marketing page feel spacious and confident is
the same density that makes a data table unusable, forcing extra scrolling and
burying rows below the fold. Treating density as one global scale forces every
surface into the wrong trade-off, while two coordinated modes let each surface
use the ratio suited to how much information it needs to show per screen.

Example: table rows use compact mode (13px/1.4, 4px row padding), the pricing
page above it uses comfortable mode (18px/1.6, 24px section gaps).

Counter-example: applying the marketing scale's 1.6 line-height and 24px block
spacing to a 40-row settings table, pushing half the rows below the fold.
