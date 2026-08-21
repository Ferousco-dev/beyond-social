---
id: scanning-patterns-f-pattern-z-pattern-layer-cake-pattern-for-structured-cards-and-grids
title: The layer-cake pattern for card grids and pricing tables
category: visual-hierarchy
subcategory: scanning-patterns
tags: [card-grid, pricing-table, comparison-layout, eye-tracking]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Layouts with clear repeated blocks, card grids, pricing tables, comparison
rows, break both F and Z. Bold headers and dividers give the eye stopping
points, producing a "layer-cake" scan: the reader reads the bold header layer
across all cards first, then drops into one card's body only after comparing.

The recipe:

- Match every card's title or price in font weight and vertical position
  across the grid, so the header layer reads as one continuous horizontal
  band.
- Don't let a card's body copy start heavier than its own title; that breaks
  the headers-first layer and pulls the eye into detail before comparison
  happens.
- Order cards left to right by the decision you want made first, cheapest to
  priciest, or a flagged "most popular" card positioned where the header-layer
  scan naturally slows, typically the middle card.
- Keep card heights uniform; uneven heights break the header band into a
  jagged line the eye can't sweep in one pass.

Why: repeated structure trains the reader to treat the layout as tabular
rather than narrative. They optimize for comparison, scan every header first,
then drill into one, instead of following F or Z. Writing card copy like
prose paragraphs fights a scan pattern the grid structure already dictates.

Example: three pricing cards with titles and prices pixel-aligned in a single
row, a "Most popular" badge on the center card.
Counter-example: a card grid where one title wraps to two lines while the
others stay on one. The header band's alignment breaks and the layer-cake
scan collapses back into an ad hoc, unpredictable path.
