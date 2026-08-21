---
id: tables-and-data-density-status-chip-cells
title: Status and badge cells within dense rows
category: component
subcategory: tables-and-data-density
tags: [tables, status, badges, accessibility]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A status column renders each value as a small colored pill with a text label,
never color alone, and draws from a fixed, limited palette so the eye can learn
to pattern-match colors to meanings across the whole table.

- Cap the semantic palette at 5-7 colors total across the entire product (e.g.,
  neutral/gray for default, green for success, amber for warning/pending, red for
  error/failed, blue for informational/in-progress) and reuse the same mapping in
  every table, not a fresh scheme per feature.
- Always pair color with a text label inside the pill ("Active," "Failed") — never
  ship a bare colored dot as the sole indicator, since color-blind users and
  anyone in bright ambient light can lose the distinction between adjacent hues.
- Keep pill height inside the row's density mode (e.g., 20px pill in a 32px
  compact row) with enough vertical padding to avoid the pill visually touching
  the row divider above or below it.
- Use a light-tint background with a matching darker text color for the label
  (not a solid saturated fill with white text) at high density — solid fills at
  small sizes read as decorative blocks and compete harder with the row's
  hairline dividers and other cells.
- Sort status columns by defined severity/priority order when sorted (error >
  warning > pending > success > neutral), not alphabetically — alphabetical order
  scrambles the operational meaning of the sort.

Why: a status column is scanned as a pattern, not read as text, once a user has
learned the palette; keeping the palette small and consistent across every table
in the product is what makes that pattern-matching transferable, while text
labels keep the same information available to anyone who can't rely on color.

Example: "Failed" pill using `background: #fef2f2; color: #b91c1c` at 20px
height inside a 32px compact row, versus "Active" using `background: #f0fdf4;
color: #15803d`.

Counter-example: a solid red circle with no text label representing "Failed" —
readable at a glance for most sighted users, illegible to anyone with red-green
color vision deficiency and to anyone who can't recall what red means in this
particular table.
