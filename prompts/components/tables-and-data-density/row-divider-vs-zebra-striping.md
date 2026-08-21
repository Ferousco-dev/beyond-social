---
id: tables-and-data-density-row-divider-vs-zebra-striping
title: Hairline dividers versus zebra striping at high density
category: component
subcategory: tables-and-data-density
tags: [tables, density, visual-noise, dividers]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Zebra striping (alternating row background colors) helps row-tracking in
low-density tables with generous row height, but at compact density it competes
with the data instead of supporting it — prefer a 1px hairline divider instead.

- Below roughly 40px row height, drop zebra striping and use a single 1px
  bottom-border on each row at low contrast (roughly 8-12% opacity against the
  background), which reads as structure without adding a second competing color
  pattern.
- Reserve zebra striping for taller rows (44px+) where each stripe is wide enough
  to register as a background field rather than a thin, flickering band when the
  user scrolls.
- Never combine zebra striping with hover highlight and selection highlight using
  similar-strength colors — at high density that produces three overlapping
  background states the eye can't distinguish, especially in dark mode.
- If row-tracking is the actual problem being solved, consider a hover-triggered
  full-row highlight instead of static striping; it helps exactly when needed
  (mid-scan) without a permanent pattern layered under every row.
- Test striping and dividers against real row counts (50-200 rows), not a 5-row
  mock — moiré and banding artifacts from alternating colors only show up at
  scroll and scale.

Why: at compact density, a stripe pattern's color transitions happen almost as
often as the text does, and the two visual rhythms fight for attention; a single
low-contrast hairline gives the eye a row boundary without adding a second
pattern to parse on top of the data itself.

Example: 32px-tall rows separated by `border-bottom: 1px solid rgba(0,0,0,0.08)`,
no background color difference between adjacent rows.

Counter-example: alternating full-saturation striping (`#f5f5f5` / `#ffffff`) on
32px rows in a 150-row table — from a normal scroll distance it reads as a
flickering moiré pattern rather than distinguishable rows.
