---
id: dashboard-layouts-priority-first-ordering
title: Priority-first ordering for dashboard content
category: layout
subcategory: dashboard
tags: [hierarchy, dashboard, information-architecture, kpi]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Order a dashboard as an inverted pyramid: the top-line answer first, the
trend that explains it second, the raw table a user consults to act third. A
data table should never be the first thing the eye lands on.

The recipe:

- Row 1 (top of the content area, no scroll): three to five headline numbers,
  each a value, a delta versus the prior period, and a one- or two-word
  label. No chart, no legend, no explanation required to read it.
- Row 2: one or two trend visualizations that explain the row-1 deltas over
  time, directly beneath the numbers they support.
- Row 3 and below: the sortable, filterable table or list a user opens only
  after row 1 raises a specific question, such as why signups dropped.
- Match visual weight to decision weight: the metric that triggers action
  (revenue, error rate, render-queue depth) gets the largest type size and the
  top-left position; supporting metrics get smaller type and sit to its right.

Why: users open a dashboard to answer "do I need to act right now," not to
read a report. Eyes scan top-to-bottom, left-to-right on first landing, so
whatever occupies that first row is what gets read even when the visit lasts
three seconds. Burying the headline under a table forces a read-then-decide
sequence instead of a glance-then-decide one, which is why at-a-glance
dashboards beat everything-visible dashboards on task completion time.

Example: "Active renders: 12,400 (+8% wk/wk)" as the largest card, top-left,
with a 7-day sparkline directly under it and the detailed job table below the
fold.
Counter-example: opening the dashboard on a 40-row job table with the
headline KPIs relegated to a thin strip at the bottom, forcing the user to
read every row before knowing whether anything needs attention.
