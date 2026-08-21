---
id: microcopy-and-error-messages-empty-state-zero-search-results
title: Zero search results is a different empty state than first-run
category: copywriting
subcategory: microcopy-and-error-messages
tags: [empty-states, search, filters, ux-writing]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Zero results from a search or filter is not the same event as an empty library, and treating them the same tells the user something false: that the product itself is empty rather than that their query was too narrow.

- Echo the exact query and active filters back to the user in the message, so they can see what was searched.
- Offer to clear specific filters individually, not just a single "clear all" that discards a query they may want to keep.
- Suggest a nearby or broader term when the search engine can surface one, instead of leaving a dead end.
- Never reuse the first-run illustration or "get started" copy for this state; it implies the whole library is empty.
- If results are hidden by a plan or permission limit rather than the query itself, say that specifically instead of showing zero results.

Why: a user who searched already knows content should exist; a rolled-up empty state that looks identical to a truly empty library reads as a bug or makes them believe they've reached a dead product, when the actual fix is often removing one overly specific filter.

Example: "No clips match 'sunset drone shot' with Duration: 30s+. Try removing the duration filter." [Clear duration filter]

Counter-example: showing the generic "Nothing here yet, create your first project" empty state after a filtered search returns zero rows — it misleads the user into thinking the library itself is empty when hundreds of matching clips exist under a different filter.
