---
id: tables-and-data-density-responsive-table-to-cards
title: Collapsing a table into cards at the mobile breakpoint
category: component
subcategory: tables-and-data-density
tags: [tables, responsive, mobile, breakpoint]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Below roughly 640px, a multi-column table stops working as a table; the fix is
not a horizontally scrolling table but a restructured stack of cards, one per row.

- At the breakpoint, transform each row into a card: promote the single most
  identifying field (name, order number, title) to a card heading, and render the
  remaining fields as stacked "label: value" pairs beneath it.
- Drop columns below a defined priority threshold entirely on mobile (internal
  IDs, secondary timestamps) rather than cramming every desktop column into the
  card — mobile is an edit of the data, not a compression of it.
- Keep sort and filter controls accessible above the card list; they don't
  disappear just because the layout changed from grid to stack.
- Preserve row-level actions (edit, delete, view) as a menu or trailing icon on
  each card in the same position every time, so scanning down the list stays
  predictable.
- Use CSS `display: none` on table markup below the breakpoint and a genuinely
  separate card component above it — do not fake cards by shrinking table cell
  padding to zero and stacking them with flexbox, which breaks screen readers
  that expect real `<table>` semantics on desktop.

Why: a table's value is comparing values across a column at a glance; on a
360px-wide screen there's no room for more than one or two columns anyway, so
preserving the grid just produces tiny, unreadable cells or forces horizontal
scroll, which is a worse interaction than accepting the layout has to change.

Example: desktop row "Acme Corp | $12,400 | Active | Jan 14" becomes a mobile
card: bold "Acme Corp" heading, then "Amount: $12,400", "Status: Active",
"Updated: Jan 14" stacked below.

Counter-example: shrinking font size to 10px and column padding to 2px so all six
desktop columns technically still fit on a 360px screen — every cell becomes an
illegible sliver instead of an intentional single-column layout.
