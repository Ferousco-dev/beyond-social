---
id: dashboard-layouts-chart-type-selection
title: Matching chart type to data shape
category: layout
subcategory: dashboard
tags: [charts, dashboard, data-visualization, widgets]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Chart type is a decision about the data's shape, not a decoration choice. A
dashboard that picks charts for visual variety instead of legibility forces
the user to work harder to read numbers they need in seconds.

The recipe:

- Single metric over time: line or area chart, one series, no more than one
  secondary comparison line (e.g. this period vs last period, dashed).
- Comparing discrete categories at one point in time: horizontal bar chart,
  sorted by value, not alphabetically — sorting alphabetically forces the eye
  to hunt for the largest bar instead of seeing it first.
- Part-to-whole with under 6 segments: stacked bar or simple proportional
  bar; avoid pie and donut charts on a dashboard, since angle comparison is
  slower to read at a glance than length comparison.
- Distribution across a range (latency, render duration): a histogram or box
  plot, not a line chart — a line implies a time sequence that doesn't exist
  in distribution data.
- Never default to a chart when a single number with a delta answers the
  question faster; a chart is for showing shape and trend, not for showing a
  fact that a stat card already communicates.

Why: each chart type encodes a specific perceptual comparison (position on a
common scale reads fastest, followed by length, then angle, then color area,
per established graphical-perception research), so matching type to the
comparison the user actually needs to make is what makes a chart fast to
read rather than merely present.

Example: a horizontal bar chart of "renders by template, sorted descending"
for comparing five templates.
Counter-example: a 3D pie chart of the same five templates, where perspective
distortion makes two similarly sized slices impossible to compare accurately.
