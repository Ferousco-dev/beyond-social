---
id: search-and-filter-patterns-zero-results-empty-state
title: Designing the zero-results state as a recovery path
category: layout
subcategory: search-and-filter
tags: [empty-state, zero-results, search, recovery]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A zero-results screen is the one moment in a search flow where the interface
has definitively failed the user's intent. The default of an empty grid and
"No results found" treats that failure as an endpoint; it should be treated as
a fork with named exits.

- State the exact cause when it's a filter combination, not a search term:
  "No results for Red + Under $25" (list the actual filters), so the user
  knows what to loosen without guessing.
- Offer one-click removal of the most restrictive filter, identified by which
  facet dropped the count closest to zero, rather than a generic "clear all."
- If it's a text query with zero matches, show the nearest non-empty matches
  or a spelling-corrected alternative ("Did you mean...") instead of a blank
  page.
- Never combine a zero-results state with marketing content or unrelated
  recommendations dressed up as "results" — that erodes trust in the count
  everywhere else in the product.
- Keep one visible, single-step action as the primary next move; don't present
  five equally weighted options.

Why: a user who filtered into a dead end is one bad experience away from
leaving the search entirely, but they arrived with real intent, so a specific,
one-click way back to the nearest non-empty state converts a failure into a
completed session instead of an exit.

Example: "No results for Color: Red + Price: Under $25. Remove 'Under $25' to
see 34 results" with a single button that removes just that filter.
Counter-example: a generic "No products match your search. Try adjusting your
filters." with no indication of which filter to adjust or how many results
removing it would restore.
