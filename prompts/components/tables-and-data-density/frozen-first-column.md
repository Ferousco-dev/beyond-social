---
id: tables-and-data-density-frozen-first-column
title: Frozen leading column for wide tables
category: component
subcategory: tables-and-data-density
tags: [tables, sticky, horizontal-scroll, layout]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

When a table has more columns than fit the viewport, freeze the identifying
column (usually name, ID, or the row's primary label) so it stays visible while
the rest of the row scrolls horizontally underneath it.

- Pin the leading column with `position: sticky; left: 0` and an opaque
  background; pin any row-selection checkbox column the same way, to the left of
  the frozen label column.
- Add a visible separation edge, a 1px border or subtle shadow, on the right side
  of the frozen column — without it, scrolled content appears to slide under a
  column with no boundary, which reads as a rendering bug.
- Cap frozen columns at one or two; freezing four or five columns just relocates
  the width problem instead of solving it and leaves too little scrollable area
  to be useful.
- On touch devices, make the horizontal scroll region obvious with a faint
  gradient fade at the trailing edge of visible content, or a scrollbar that
  doesn't auto-hide until the user has scrolled at least once.
- Keep the frozen column's z-index above scrolling body cells but below the
  sticky header, so the two sticky axes composite correctly at the top-left
  corner cell.

Why: in a wide operational table (a CRM record, a transactions ledger, a product
catalog), the row's identity is meaningless once decontextualized; freezing it is
what lets horizontal scroll be viable at all instead of forcing users to keep
scrolling back to check which row they're looking at.

Example: "Order ID" column frozen at `left: 0`, 160px wide, `box-shadow: 2px 0 4px
rgba(0,0,0,0.06)` on its trailing edge, remaining 11 columns scroll beneath it.

Counter-example: freezing every column up to and including "Status," leaving only
the table's least useful columns (internal notes, timestamps) in the scrollable
area — the user still can't see the two columns they actually came to compare.
