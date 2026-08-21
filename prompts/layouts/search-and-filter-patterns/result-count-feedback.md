---
id: search-and-filter-patterns-result-count-feedback
title: Surfacing the result count as a filtering signal
category: layout
subcategory: search-and-filter
tags: [result-count, feedback, filters, search]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

The result count is not a footnote, it is the fastest feedback loop a filter UI
has: it tells the user whether their last click helped before they scroll a
single row. Treat the count as a live status element, not static copy baked
into a heading.

- Place the count directly above the result grid, left-aligned with the grid,
  not buried in a page title or breadcrumb.
- Update it the instant a filter changes, even before the grid finishes
  re-rendering, so the number itself is the first confirmation the click
  registered.
- Show the count next to each unapplied facet option too ("In Stock (128)"),
  so users can predict the outcome before they click, not just read it after.
- Animate the number as a quick count transition or a brief highlight rather
  than a hard swap, so a from-142-to-9 change reads as "big drop" at a glance.
- When a filter would return zero results, show that in the facet option itself
  (grayed out with "(0)") rather than letting the user click into a dead end.

Why: filtering is trial and error from the user's side, and the count is the
only signal that closes the loop between "I clicked something" and "did that
help." Without a fast, visible count, users either over-filter past the point
of usefulness or abandon the flow assuming nothing changed, when in fact it
did.

Example: "128 results" in a 14px medium-weight label pinned above the grid,
updating with a 150ms fade whenever a facet toggles.
Counter-example: a result count that only appears in a "no results" message,
meaning a user has no feedback until they've fully filtered themselves into a
dead end, at which point the count is a punishment, not a guide.
