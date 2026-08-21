---
id: search-and-filter-patterns-sort-control-placement
title: Keeping sort visually and functionally separate from filters
category: layout
subcategory: search-and-filter
tags: [sort, filters, controls, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Sort reorders a fixed set of results; filters change which results are in that
set. They're different operations with different mental models, and merging
them into one "Filter & Sort" control makes users hunt for whichever one they
actually need.

- Place sort as a single dropdown on the opposite side of the toolbar from the
  filter trigger or facet rail — typically top-right, aligned with the result
  count on the left.
- Never nest sort options inside the facet panel; a facet narrows, sort never
  removes anything, and conflating the two teaches users the wrong mental
  model for both.
- Default the sort label to show the active choice, not a generic "Sort," so
  the current state is visible without opening the dropdown: "Sort: Price,
  low to high."
- Keep the sort option list short (4-6 choices) and domain-relevant —
  relevance, price both directions, newest, rating — instead of exposing every
  database column as a sort key.
- On mobile, sort and filter can share a toolbar row, but keep them as two
  distinct tap targets, never one combined sheet where sort options and facet
  groups are mixed in the same scrollable list.

Why: users scan for filter and sort controls independently depending on their
goal — narrowing versus reordering — so a shared control forces an extra
decision ("is what I want in here?") before they can even start the action
they came to do.

Example: toolbar reading "128 results" on the left, "Sort: Best match ▾" on
the right, with the filter trigger as its own separate button beside sort.
Counter-example: one dropdown labeled "Filter & Sort" that opens a single list
mixing "Price: Low to High" with "In Stock Only," forcing users to scan
irrelevant options to find the one they need.
