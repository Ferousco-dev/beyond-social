---
id: search-and-filter-patterns-active-filter-count-badge
title: Badging the filter trigger with an active-count indicator
category: layout
subcategory: search-and-filter
tags: [filter-badge, mobile, filters, affordance]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

When facets live behind a collapsed trigger — a mobile "Filter" button, a
collapsed rail, an overflow menu — the trigger itself is the only surface
available to answer "do I currently have filters on?" without opening
anything. A numeric badge answers that in one glance.

- Render a small circular badge on the corner of the filter button showing
  the count of active filter values (not facet groups), matching the count
  used in the chip row and the mobile sheet's Apply button.
- Hide the badge entirely at zero — an empty badge or a "0" badge both read as
  visual noise and should never appear.
- Keep the badge count in sync in real time with chip removals, the Clear All
  action, and Apply confirmations inside a filter sheet, never a stale number
  left over from a prior session.
- Use a filled, high-contrast badge color distinct from the button's own
  color, since a same-hue badge on a same-hue button is easy to miss at
  small mobile sizes.
- Don't combine the filter badge with the sort indicator; if sort and filter
  share a toolbar, each gets its own state indicator so a user can tell which
  one is active without opening either.

Why: a collapsed control hides its own state by design, so without an external
indicator a user returning to a page has no way to tell, at a glance, whether
the current results are already narrowed — which matters most exactly when
they're re-entering a flow they left mid-task and need to reconstruct where
they were.

Example: a "Filter" button with a small red badge reading "3" in its top-right
corner, disappearing the instant the user clears all three filters.
Counter-example: a filter button with no badge at all, so a user who applied
filters, navigated away, and came back has to open the panel just to confirm
whether any filters are still active.
