---
id: tables-and-data-density-sortable-column-headers
title: Sortable column header interaction
category: component
subcategory: tables-and-data-density
tags: [tables, sorting, interaction, affordance]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A sortable header only works if the whole cell is the click target and the current
sort state is legible at a glance, not just the presence of an icon.

- Make the entire header cell (label plus padding) clickable, minimum 40px tall on
  desktop and 44px on touch; a lone 12px arrow glyph is not an adequate hit target.
- Show a muted, low-contrast sort icon on unsorted columns only on hover/focus, and
  a full-opacity, bold icon on the currently active sort column so it reads even
  when the user isn't hovering.
- Use two distinct glyphs for direction (chevron-up / chevron-down), never one
  static arrow that flips with no visible change, and never a generic "sortable"
  icon that doesn't say which way.
- Pick a sensible first-click default per data type: numeric and date columns sort
  descending first (biggest/most recent first, matching how people scan a report);
  text columns sort ascending first (A to Z).
- Persist the active sort column and direction in the URL query string so a
  reload or a shared link reproduces the same view.

Why: users scan headers in under a second to orient themselves in a table; if the
active sort isn't visually distinct from the other seven column headers, they
re-click to "check," which either double-sorts or reverses their intended order.
Type-aware defaults remove a wasted first click for the most common report-reading
pattern (find the biggest number, find the newest row).

Example: "Revenue" header, right-aligned sort icon, bold black chevron-down when
active versus a 40%-opacity chevron-up/down pair shown only on `:hover` for the
other seven headers.

Counter-example: a single spinner-like arrow icon that rotates 180 degrees on
click with no color or weight change — indistinguishable from a decorative icon
and impossible to tell, at rest, which column (if any) is currently driving order.
