---
id: tables-and-data-density-multi-column-sort-indicators
title: Multi-column sort and priority indicators
category: component
subcategory: tables-and-data-density
tags: [tables, sorting, power-user, indicators]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

When a table supports sorting by more than one column at once (status, then
within status by date), the UI needs to show sort priority explicitly, not just
which columns are active.

- Trigger secondary sort with a modifier click (shift-click is the established
  convention from spreadsheet software) rather than a separate menu, so power
  users don't have to leave the table to layer a second sort key.
- Show a small numbered badge (1, 2, 3) next to each active sort column's
  direction icon, indicating its priority in the sort chain — without a number,
  two active sort icons look identical and the order they apply in is invisible.
- Clicking a column with no modifier always resets to a single-column sort on
  that column; this is the escape hatch back to a simple, predictable state and
  must never require holding a modifier to "undo" a multi-sort.
- Cap practical multi-sort at two or three columns in the UI even if the data
  layer supports more — beyond that, users can't hold the ordering in their head
  and a saved view or explicit sort-builder panel serves them better than stacked
  header clicks.
- Surface the active multi-sort as plain text somewhere persistent ("Sorted by
  Status, then Date ↓") for users who arrive at the table mid-session and didn't
  see the clicks that produced it.

Why: sort priority is invisible information — two columns can each show an
active descending arrow while sorting in a completely different combined order
depending on which was clicked first; the numbered badge is the only way to make
that ordering legible without opening a separate settings panel.

Example: "Status" header shows chevron-down with superscript "1"; "Updated"
header shows chevron-down with superscript "2," reflecting shift-click order.

Counter-example: two columns both showing an unnumbered active-sort icon with no
indication of which was applied first — the resulting row order looks arbitrary
to anyone who didn't perform the clicks themselves.
