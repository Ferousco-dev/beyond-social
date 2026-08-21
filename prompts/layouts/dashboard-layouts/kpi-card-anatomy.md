---
id: dashboard-layouts-kpi-card-anatomy
title: Anatomy of a KPI stat card
category: layout
subcategory: dashboard
tags: [kpi, dashboard, cards, metrics]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A stat card has exactly four elements in a fixed order, and every element
answers a different question, so dropping or reordering one breaks the read.

The recipe:

- Label (top, smallest text, muted color): what this number is, in two or
  three words, never a full sentence.
- Value (center, largest text, full-contrast color): the current number,
  formatted the way the audience thinks about it (1.2K not 1200, 4.8% not
  0.048).
- Delta (beside or under the value, color-coded): change versus a stated
  comparison period, always with a direction glyph and the period named
  ("+8% vs last week"), never a bare percentage with no baseline.
- Trend (bottom, a sparkline or micro-bar, no axis labels): shape only, not a
  chart to be read in detail — its job is to answer "trending up or down"
  in under a second.
- Cap it there. A stat card that also carries a filter control, a menu, and a
  legend has stopped being a stat card and become a mini dashboard.

Why: each element serves a distinct cognitive step (identify, quantify,
contextualize, confirm) and stacking them in this order matches how someone
actually reads a number: what is it, how much, better or worse, is that
recent. Reversing the order, e.g. showing the delta before the value, forces a
re-read once the value finally appears.

Example: "Active renders / 12,400 / +8% vs last week / [sparkline]" stacked
vertically in a 220px-wide card.
Counter-example: a card showing "12,400" with no label and no comparison
period — the number is unreadable without clicking through, which defeats the
purpose of a summary card.
