---
id: tables-and-data-density-skeleton-loading-state
title: Row-shaped skeleton loading for tables
category: component
subcategory: tables-and-data-density
tags: [tables, loading, skeleton, perceived-performance]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

While a table's data is loading, render skeleton rows shaped like the eventual
content, at the eventual row height, rather than a centered spinner that hides
the table's structure.

- Render the real header row immediately (labels are already known before the
  data fetch resolves) and only skeleton the body cells beneath it.
- Match skeleton bar widths per column to that column's typical content: a wide
  bar under "Name," a narrow bar under "Status," a right-aligned narrow bar under
  a numeric column — uniform-width bars in every cell look like a generic
  placeholder, not a preview of this table.
- Use 6-10 skeleton rows at the table's actual row height so the loading state
  occupies the same vertical space the real data will, preventing a layout jump
  the instant data arrives.
- Animate with a slow (1.5-2s), low-contrast shimmer sweeping left to right;
  faster or higher-contrast shimmer reads as an error/flashing state rather than
  "content is loading."
- Swap skeleton for real rows in place, never via a full remount that resets
  scroll position or triggers a visible flash of blank white between states.

Why: a centered spinner discards everything the user has already learned about
the table's shape (column count, roughly how wide each column is), forcing them
to reorient once data arrives; shaped skeletons let the layout register before
the content does, so the transition to real data feels like a fill-in rather than
a scene change.

Example: skeleton "Amount" cell as a 48px-wide, right-aligned gray bar at 8px
height, animating shimmer at 1.8s duration, positioned exactly where the real
right-aligned dollar figure will render.

Counter-example: a single spinner icon centered in an otherwise blank table body
with the header hidden — the user has no idea how many columns exist or how the
data will be shaped until it suddenly appears.
