---
id: search-and-filter-patterns-facet-panel-placement
title: Facet panel placement by viewport
category: layout
subcategory: search-and-filter
tags: [facets, filters, layout, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Facet placement is not a style choice, it is a scan-path decision. On desktop,
facets belong in a persistent left rail because F-pattern eye-tracking studies
show users scan left-to-right, top-to-bottom, and a left rail is read before the
result grid. On mobile, there is no room for a rail, so facets collapse into a
single "Filter" trigger that opens a full-screen or bottom-sheet overlay.

- Desktop: left rail, roughly 20-25% of viewport width, results in the remaining
  space; never right-align facets, it fights the natural scan order.
- Rail stays visible on scroll (sticky or independently scrollable) so a facet
  change never requires scrolling back up.
- Mobile: one "Filter" button in the sticky sub-header, badge with the active
  count, opens an overlay; never render a collapsed accordion rail inline on
  mobile, it pushes results below the fold.
- Category or top-level facets (the ones that change the whole result set, like
  department) can live in a horizontal bar above the grid; narrowing facets
  (price, brand, size) stay in the rail or drawer.

Why: facets are a navigation tool, not decoration, so they need the position a
user's eyes reach first and the persistence to stay usable mid-scroll. Burying
them below results or behind an unlabeled icon measurably lowers filter usage
and pushes users toward abandoning a search instead of refining it.

Example: "sticky left rail, 280px wide, facet groups: Category, Price, Brand,
Rating, each collapsible, results grid fills remaining width."
Counter-example: filters placed below the fold under the result grid on desktop
so a user must scroll past forty products before finding them, if they ever do.
