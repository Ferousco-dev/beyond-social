---
id: dashboard-layouts-widget-grid-system
title: The widget grid system
category: layout
subcategory: dashboard
tags: [grid, dashboard, layout-system, widgets]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Dashboard widgets sit on a fixed 12-column grid with a single gutter value, so
every card's width is a multiple of one column and cards from different rows
always line up vertically.

The recipe:

- Base unit: pick one gutter (commonly 16px or 24px) and one row height unit;
  every widget's height is a multiple of that unit, never an arbitrary pixel
  value chosen to fit its content.
- Standard spans: stat cards at 3 columns (four per row on desktop), trend
  charts at 6 columns (two per row), tables and detail panels at 12 columns
  (full width). Avoid odd spans like 5 or 7 columns that don't divide evenly.
- Vertical rhythm: a card's internal padding, its title-to-content gap, and
  the gap between cards should all derive from the same spacing scale (e.g.
  4/8/12/16/24/32), not independently chosen values.
- Let content overflow inside the card (scroll a long list internally) rather
  than growing the card past its grid-determined height and breaking row
  alignment with neighboring cards.

Why: a shared grid is what makes a dashboard look assembled rather than
collaged. When every card obeys the same column and spacing scale, cards
authored by different engineers or added months apart still align, and a user
scanning across a row perceives one system instead of a set of unrelated
boxes each with their own logic.

Example: a 3-6-3 row (small stat card, wide trend chart, small stat card) that
sums to 12 columns, 24px gutter, 8px internal card padding.
Counter-example: a card sized to exactly fit its content (like a 340px-wide
box because that's how wide its longest table row happens to be) that leaves
a ragged, unaligned edge against its neighbors on both desktop and resize.
