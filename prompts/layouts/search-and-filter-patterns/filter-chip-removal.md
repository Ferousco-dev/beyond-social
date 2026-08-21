---
id: search-and-filter-patterns-filter-chip-removal
title: Applied-filter chips as the undo mechanism
category: layout
subcategory: search-and-filter
tags: [filter-chips, chips, undo, search]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Once a facet panel and a result grid are both on screen, a user has no single
place to see what's currently narrowing their results. A row of applied-filter
chips above the grid solves that: it is the only UI element whose entire job is
"here is what you did, and here is how to undo one piece of it."

- Render one chip per active filter value, not per facet group: "Red" and
  "Blue" are two chips if both are selected under Color, not one "Color (2)"
  chip that hides which values are active.
- Every chip carries its own inline "x" so removing one filter never requires
  reopening the facet panel that produced it.
- Order chips by the order filters were applied, not alphabetically, so the
  row matches the user's own mental model of their session.
- Include a "Clear all" action at the end of the row once there are two or
  more chips, not before.
- Keep the chip row visible without scrolling the page; if it wraps to two
  lines, let it wrap, don't truncate or horizontally scroll it.

Why: facets live in a panel the user has often scrolled past or collapsed by
the time they want to change their mind, so making them reopen that panel just
to remove one value adds friction to the single most common recovery action in
a filtered search: "actually, not that one."

Example: a chip row reading "Red ×  Under $50 ×  4+ stars ×  Clear all" sitting
directly above "128 results."
Counter-example: a single "Filters (3)" chip that opens a modal to see and
remove individual values, turning a one-click undo into a three-click detour.
