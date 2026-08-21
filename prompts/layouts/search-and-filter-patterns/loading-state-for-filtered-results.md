---
id: search-and-filter-patterns-loading-state-for-filtered-results
title: Signaling a filter refetch without hiding the previous results
category: layout
subcategory: search-and-filter
tags: [loading-state, skeleton, filters, performance]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Toggling a filter triggers a refetch, and the interval before new results
arrive needs its own state — but that state should read as "updating" against
what's already visible, not as a full-page loader that erases the user's
context.

- Dim the existing grid (reduce opacity to roughly 40-50%) and disable its
  interactions while the new result set loads, rather than replacing it with a
  blank page or a full skeleton.
- Keep the facet panel and applied-filter chips fully interactive during the
  load — a fast typist toggling three filters in a row shouldn't have to wait
  for each round trip before the next click registers.
- Show a small inline spinner near the result count, not a full-viewport
  overlay, so scroll position and layout stay stable through the transition.
- Debounce rapid successive filter changes (e.g., dragging a range slider) so
  only the settled value triggers a fetch, instead of firing and dimming the
  grid on every intermediate tick.
- Use a real skeleton grid only for the very first load of a page, when there
  are no previous results to dim; never skeleton over results that already
  exist.

Why: a filter change is an edit to an existing view, not a navigation to a new
one, so the loading treatment should preserve spatial continuity — the user's
eyes are already on a specific row or card, and a blank-page reset forces them
to reorient for no reason once the new results land.

Example: the current grid drops to 45% opacity with a small spinner beside
"128 results," then crossfades to the new grid and count once data arrives.
Counter-example: the entire grid area replaced by a full-page skeleton loader
on every single filter toggle, discarding scroll position and forcing the eye
to re-scan from the top each time.
