---
id: search-and-filter-patterns-progressive-facet-disclosure
title: Truncating long facet lists with show-more and in-facet search
category: layout
subcategory: search-and-filter
tags: [facets, progressive-disclosure, long-lists, filters]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A facet with hundreds of values (brand on a large marketplace, tags on a large
dataset) breaks a fixed-height panel if rendered in full, but truncating it
without a way back defeats the facet's purpose. The fix is showing the highest-
signal values first with an explicit path to the rest.

- Show the top 5-8 values by result count when a facet group first renders,
  collapsed under a "Show more (42)" toggle naming exactly how many more
  exist.
- Once expanded, add a small in-facet search input if the list exceeds ~15
  values, so a user hunting for one known value ("Patagonia") doesn't have to
  scroll a long list.
- Keep already-selected values pinned at the top of the list regardless of
  count or alphabetical order, even after "Show more" collapses back down.
- Don't paginate facet values with numbered pages; a single expand and an
  in-facet search cover the same need with less interaction cost.
- Preserve scroll position within the facet panel when a value is toggled, so
  selecting item #30 doesn't snap the panel back to the top.

Why: the first handful of values by frequency cover the majority of real
narrowing decisions, so showing those by default keeps the panel scannable,
while an explicit count on "Show more" and an in-facet search serve the
minority of users hunting for a specific long-tail value without forcing
everyone else to scroll past it.

Example: a Brand facet showing "Nike, Adidas, Puma, New Balance, Asics" with
"Show more (37)" below, which expands into a scrollable list with a "Search
brands" input pinned at its top.
Counter-example: rendering all 42 brand values inline with no truncation,
pushing every facet group below it off-screen and turning the panel into an
unusable scroll of names most users will never look for.
