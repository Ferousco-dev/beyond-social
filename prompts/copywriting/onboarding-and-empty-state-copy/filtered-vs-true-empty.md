---
id: onboarding-and-empty-state-copy-filtered-vs-true-empty
title: Distinguish "nothing here yet" from "nothing matches"
category: copywriting
subcategory: onboarding-and-empty-state-copy
tags: [empty-state, search, filters, returning-user]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

An empty result from a filter or search is a different event than a true
first-run empty state, and treating them the same either scares a returning
user with copy that misdescribes their own library, or wastes an onboarding
pitch on someone who just typed a typo.

- True empty (zero items ever created): teach the first action, as in a
  standard first-run empty state.
- Filtered empty (items exist, current view shows none): name the filter
  hiding them and offer to clear it. Never repeat onboarding copy here.
- Search empty: echo the query text back ("No results for 'beach ad'") so the
  user trusts the search actually ran rather than silently failing.
- Distinguish the two states in code by total item count versus filtered
  count, not by list length alone. A single boolean collapses both cases into
  one copy slot and guarantees the wrong message ships in one of them.
- Give each case one specific recovery action: "Clear filters" for
  filtered-empty, "Try a different search" for search-empty, "Create your
  first X" for true-empty.

Why: a returning user with forty saved videos who applies a filter that
matches zero should never see first-run marketing copy. It reads as if the
product forgot their work, which erodes trust faster than an actual bug would,
because it implies data loss rather than a narrow filter.

Example: "No videos match 'Instagram' + 'Last 7 days'. Clear filters to see
all 42 videos."
Counter-example: showing "You haven't created any videos yet. Get started!"
to a user with a full library and an over-narrow filter applied, implying
their work is gone.
