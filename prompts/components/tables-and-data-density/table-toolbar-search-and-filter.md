---
id: tables-and-data-density-table-toolbar-search-and-filter
title: Table toolbar layout for search, filters, and view controls
category: component
subcategory: tables-and-data-density
tags: [tables, toolbar, filters, search]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

The toolbar above a dense table has a consistent, learnable layout: search on the
left, filter and grouping controls in the middle, view-level controls (density,
column visibility, export) on the right — and active filters render as removable
chips, not hidden inside a dropdown.

- Left-align a single search input scoped to the table's own data, with visible
  placeholder text naming what it searches ("Search by name or email"), not a
  generic "Search."
- Place filter triggers (dropdowns, date-range pickers) immediately right of
  search; each open filter that has an active value shows its selection inline on
  the trigger itself ("Status: Active ×") rather than requiring a click to see
  what's currently applied.
- When one or more filters are active, render them as a second row of removable
  chips directly below the toolbar, each with its own "×" and a single "Clear
  all" action — this is the only place a user can see every active constraint at
  once without opening each dropdown individually.
- Right-align controls that change how the table displays rather than what data
  it shows: density toggle, column visibility, export/download — keeping the
  data-altering and view-altering controls on visually opposite sides prevents
  users from confusing "change what I see" with "change what's here."
- Keep the toolbar's height and controls fixed regardless of row count or filter
  state, so it doesn't reflow the table body's starting position as filters are
  added or removed.

Why: consistent left-to-right ordering (find something specific, narrow the set,
change the display) matches the order users actually reason in, and exposing
active filters as chips means the toolbar itself is the answer to "what am I
currently looking at," without requiring memory of which dropdowns were touched.

Example: toolbar reading "[Search by name] [Status: Active ×] [Date: Last 30d ×]
… [Density ▾] [Columns ▾] [Export]" with an active-filter chip row beneath it.

Counter-example: burying all filters inside a single "Filters" button that opens
a modal, giving no visual trace on the toolbar itself of which filters are
currently narrowing the table — a user has to reopen the modal just to remember
what they searched for.
