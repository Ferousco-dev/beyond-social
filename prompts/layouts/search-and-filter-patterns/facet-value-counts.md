---
id: search-and-filter-patterns-facet-value-counts
title: Showing counts on unselected facet values
category: layout
subcategory: search-and-filter
tags: [facets, counts, filters, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A facet list without counts asks the user to click blind. Appending the result
count each value would produce, computed against the currently active filters,
turns the facet panel from a list of guesses into a list of previews.

- Show counts in parentheses after every unselected value: "Cotton (412),
  Wool (38), Silk (6)," recalculated live as other filters change, not fixed
  at page load.
- Gray out (but don't hide) values that would return zero results given the
  current filter combination, so the list stays stable and nothing jumps
  position as filters change.
- Sort facet values by count descending as the default within a group, except
  for facets with a natural order (size, price bands), which stay in that
  order regardless of count.
- Drop the count only on the already-selected value in a multi-select list,
  since it's redundant with the overall result count shown above the grid.
- Round large counts for scannability ("1.2k") but keep exact counts under
  1,000, where the precision still helps a user gauge how narrow a choice is.

Why: counts convert facets from a navigation menu into a forecasting tool —
the user can tell, before clicking, whether a value will meaningfully narrow
results or barely move the needle, which is the actual decision they're
trying to make at each step of a multi-facet search.

Example: "Brand: Nike (89), Adidas (64), Puma (12), New Balance (0, grayed)."
Counter-example: a facet list of brand names with no counts at all, forcing
the user to click each one, watch the grid update, and mentally reconstruct
what a count-annotated list would have told them upfront.
