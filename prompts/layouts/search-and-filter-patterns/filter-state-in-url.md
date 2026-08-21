---
id: search-and-filter-patterns-filter-state-in-url
title: Encoding filter state in the URL, not just app memory
category: layout
subcategory: search-and-filter
tags: [url-state, filters, shareable, browser-history]
applicability:
  platforms: [web]
  productTypes: [e-commerce, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

If a filtered view only exists in component state, it dies the moment the tab
closes, the link is shared, or the back button is pressed. Encoding active
filters as URL query parameters makes every filtered state a real, addressable
page.

- Serialize each active facet as a query parameter (`?color=red&price=0-50`),
  using stable, human-readable keys, not opaque encoded blobs.
- Update the URL via `pushState` on each filter change so the back button
  steps through filter history one change at a time, not straight back to the
  unfiltered page.
- Read filters from the URL on load so a shared or bookmarked link reproduces
  the exact filtered view, including sort order and page number.
- Keep the base path stable; filters live in the query string, not the path,
  so `/shoes?color=red` and `/shoes?color=blue` are the same route with
  different state, not different pages.
- Strip default-value parameters from the URL (don't write `?sort=relevance`
  when relevance is already the default) to keep shared links short and
  readable.

Why: a filtered search result is a legitimate destination — someone comparing
options wants to share it, reopen it tomorrow, or hit back without losing five
steps of narrowing at once — and none of that is possible if the filter state
lives only in memory that resets on reload.

Example: `/sneakers?brand=nike,adidas&price=25-100&sort=price-asc` reproducing
the exact same grid, chips, and sort order when opened fresh in a new tab.
Counter-example: a filter panel that updates the grid via client state alone,
so refreshing the page, sharing the link, or pressing back all silently reset
every filter the user just applied.
