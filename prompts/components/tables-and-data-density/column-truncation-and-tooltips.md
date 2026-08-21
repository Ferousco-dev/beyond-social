---
id: tables-and-data-density-column-truncation-and-tooltips
title: Column truncation and reveal-on-hover tooltips
category: component
subcategory: tables-and-data-density
tags: [tables, truncation, tooltips, overflow]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Long text in a fixed-width column should truncate with an ellipsis and expose
the full value only on demand, rather than either wrapping the row taller or
silently cutting text with no way to recover it.

- Set explicit `min-width` and `max-width` per column (derived from realistic
  content, not the longest string in a 5-row mock) with `text-overflow: ellipsis;
  white-space: nowrap; overflow: hidden`.
- Attach a tooltip only to cells that are actually truncated, not to every cell in
  the column — measure `scrollWidth > clientWidth` at render and conditionally
  wire the tooltip, since a tooltip on already-short text is just extra motion
  noise on hover.
- Delay tooltip appearance by 300-500ms after hover starts so a user scanning
  quickly down a column doesn't trigger a flurry of popups they never meant to
  read.
- Let users widen a column manually (drag the header border) as a persistent
  alternative to hovering repeatedly for the same column's full values.
- Never truncate the column the user is most likely to be scanning for
  (typically the row's identifying label); truncate secondary or long-form
  columns like descriptions and notes first.

Why: fixed-width tables are non-negotiable for scanability, but real data doesn't
respect column widths; truncation preserves the grid while the tooltip is the
recovery path for the minority of rows where the full value actually matters,
without permanently sacrificing either.

Example: a "Description" cell showing "Renew enterprise contract for the…" with
`title` attribute or custom tooltip revealing the full sentence 400ms after
hover.

Counter-example: allowing every cell to wrap freely so a single long description
stretches its row to three lines while every other cell in that row sits mostly
empty — one verbose row visually dominates and breaks the table's rhythm.
