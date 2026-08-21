---
id: dashboard-layouts-hero-metric-emphasis
title: Giving one metric visual dominance
category: layout
subcategory: dashboard
tags: [hierarchy, dashboard, typography, kpi]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Every dashboard should have exactly one number that is visually louder than
every other number on the screen: the metric the product exists to move.
Treating five metrics as equally important makes the user do the prioritizing
the layout should have done.

The recipe:

- Pick one north-star metric per dashboard (revenue for a billing dashboard,
  render success rate for a generation-queue dashboard) and give it roughly
  2x the type size of every other stat card.
- Place it top-left or top-center, first in reading order, before any other
  widget.
- Reserve full-saturation accent color for this one metric's delta indicator;
  every other card's delta uses a lower-contrast or smaller-scale version of
  the same color language.
- Resist the urge to add a second hero metric "because it's also important."
  If two numbers compete for the same visual weight, neither wins and the
  page reads as flat.

Why: visual hierarchy is a finite resource — if everything is emphasized,
nothing is, and the user has to read the whole page instead of glancing at
one number and knowing where they stand. A single dominant metric also gives
the team a forcing function: naming the one number that matters most is a
product decision the layout makes visible, not just a design choice.

Example: a render-analytics dashboard where "Success rate: 97.2%" sits in
32px type at the top, while "Avg render time," "Queue depth," and "Retry
rate" sit in 18px type beside and below it.
Counter-example: four stat cards of identical size and color weight in a row,
forcing the reader to compare all four before knowing which one the team
actually cares about this week.
