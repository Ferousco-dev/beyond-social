---
id: dashboard-layouts-responsive-stack-order
title: Mobile stack order for dashboard grids
category: layout
subcategory: dashboard
tags: [responsive, dashboard, mobile, grid]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

When a multi-column desktop dashboard collapses to a single mobile column,
the vertical order the widgets stack into is a deliberate priority decision,
not whatever order they happened to sit in left-to-right on desktop.

The recipe:

- Assign every widget an explicit stack-order value independent of its
  desktop grid position; the hero metric goes first regardless of whether it
  was top-left or top-center on desktop, and low-priority widgets (a
  settings shortcut card, a secondary chart) go last regardless of where
  they sat visually on the wide layout.
- Collapse multi-column stat card rows into a 2-column grid on mobile rather
  than a strict single column, so four stat cards still form a compact
  block instead of forcing four full-width scrolls before the first chart
  appears.
- Drop sparkline and trend detail from stat cards on the narrowest
  breakpoints if width can't support a legible line — show the delta text
  alone rather than rendering an illegibly compressed chart.
- Never reorder based purely on DOM source order left over from the desktop
  markup; source order that made sense in a 3-column layout often puts a
  secondary metric before the primary one once flattened to one column.

Why: desktop position encodes priority through both vertical and horizontal
placement (top-left reads first), but a single mobile column only has one
axis left, so the horizontal priority information has to be explicitly
re-encoded as stack order or it's lost, typically demoting the actual hero
metric behind whatever widget happened to render first in the markup.

Example: on mobile, the hero success-rate card renders first full-width,
followed by a 2-column row of four smaller stat cards, followed by the trend
chart, followed by the jobs table.
Counter-example: naive CSS reflow that stacks desktop's left column entirely
before starting the middle column, burying the hero metric (which sat top-
center on desktop) below six unrelated cards from the left column.
