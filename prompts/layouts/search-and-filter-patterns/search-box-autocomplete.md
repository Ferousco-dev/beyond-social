---
id: search-and-filter-patterns-search-box-autocomplete
title: Search-box autocomplete as a shortcut, not a gate
category: layout
subcategory: search-and-filter
tags: [autocomplete, search-input, typeahead, search]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Autocomplete exists to shorten the path to a result the user already has in
mind, not to force them down a predefined list. The moment it blocks free-text
submission or hides the fact that pressing Enter still works, it stops being
a convenience and becomes an obstacle.

- Debounce the suggestion request 150-250ms after the last keystroke; firing on
  every keystroke wastes calls and produces visible suggestion flicker.
- Show a maximum of 6-8 suggestions, grouped by type if the product mixes
  categories (products, categories, brands) with a small label per group.
- Bold or highlight the matched substring within each suggestion so the user
  can see why it matched, not just that it did.
- Keyboard nav (arrow keys, Enter, Escape) must work identically to mouse
  interaction; a suggestion list that only responds to clicks fails anyone
  who's already typing.
- Always let plain Enter submit the raw typed query even if no suggestion is
  highlighted — never require a selection from the list to search.

Why: a fast typist forms a query in their head before the UI catches up, so
the suggestions have to be an optional accelerant that appears without
demanding attention, not a modal-like list that steals focus from the input
or blocks the query the user actually typed.

Example: typing "run sh" shows "running shoes (category)" and "Run Shift
sneaker (product)" with "run sh" bolded in each, while Enter still searches
the literal text "run sh" if nothing is selected.
Counter-example: a dropdown that must be clicked to proceed, with Enter doing
nothing until a suggestion is highlighted, silently discarding a query the
autocomplete didn't anticipate.
