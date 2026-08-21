---
id: cognitive-load-and-progressive-disclosure-dashboard-glance-vs-drilldown
title: Dashboard glance metrics versus drill-down detail
category: ux-heuristic
subcategory: progressive-disclosure
tags: [dashboard, information-hierarchy, progressive-disclosure, cognitive-load]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A dashboard has two audiences reading the same screen at different speeds — the
person glancing for a status check and the person digging for a root cause —
and it should serve the fast read by default while keeping the slow read one
click away, not average the two into a screen that serves neither well.

The recipe:

- Put three to five headline numbers above the fold, each answering "is this
  fine or not fine" at a glance — no more; a glance view with twelve metrics
  isn't a glance anymore.
- Make every headline number clickable straight into its own breakdown — the
  drill-down is the same data at higher resolution, not a separate report the
  user has to relocate.
- Reserve raw tables, per-item logs, and filter controls for the drill-down
  level; the glance level shows aggregates and trend direction only.
- Encode "needs attention" visually at the glance level (color, an icon, a
  delta arrow) so the decision to drill down is itself fast, not a second
  reading task layered on the first.
- Keep the glance level static — no per-widget settings, no rearrangeable
  panels — configurability belongs in the drill-down or in a separate
  customization mode, not competing for attention on the summary screen.

Why: a status check and a diagnostic session are different cognitive tasks with
different time budgets — five seconds versus five minutes — and cramming both
into one flat screen forces the five-second reader to wade through
five-minute-density information just to find the number they came for.
Separating altitude by default and connecting the levels with a click preserves
both speeds without duplicating the underlying data.

Example: "Videos generated today: 142 (up 12%)" as a glance tile that opens a
per-hour, per-format breakdown table when clicked.

Counter-example: a dashboard that opens directly into a 40-row sortable table of
every generation event — technically all the information is there, but there is
no five-second answer to "is today normal."
