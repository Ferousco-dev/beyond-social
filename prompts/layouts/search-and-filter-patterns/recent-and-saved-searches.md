---
id: search-and-filter-patterns-recent-and-saved-searches
title: Surfacing recent and saved searches ahead of a fresh query
category: layout
subcategory: search-and-filter
tags: [saved-searches, search-history, personalization, search]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

The moment a user taps an empty search box, before they've typed anything, is
a real opportunity: showing their last few queries or filter combinations
turns a blank state into a shortcut back to work they were already doing,
instead of forcing a full retype.

- On focus of an empty search input, show up to 5 recent queries (plain text
  strings the user typed, not filter states) as a simple tappable list, most
  recent first.
- Keep recent searches separate from saved searches — recent is automatic and
  capped, saved is explicit (a user names and pins it) and persists until
  removed.
- Let a user remove a single recent-search entry inline (small "x" per row)
  without clearing the whole history, and offer a distinct "Clear recent
  searches" action for the full list.
- For saved searches that represent a full filter state (not just text), show
  the underlying filters as a one-line summary under the saved name: "Under
  $50, In Stock, 4+ stars," so the user knows what they're re-applying.
- Never surface someone else's search history in a shared or logged-out
  session; recent and saved searches are per-account state, not per-device
  cache shared across users.

Why: a returning user with a specific task in mind (checking on the same
filtered category again next week) shouldn't have to reconstruct four facet
selections from memory every time — recent and saved searches turn a stateless
search box into something with continuity across sessions, which is exactly
what repeat searchers actually want from it.

Example: tapping the search field shows "Recent: running shoes, waterproof
jackets, gift ideas under $30" as three tappable rows above the keyboard.
Counter-example: an empty search box that always opens blank with no memory of
past queries, forcing a returning user to retype "waterproof jackets" verbatim
every single visit.
