---
id: dashboard-layouts-global-filter-bar-placement
title: Placing the global time-range and filter bar
category: layout
subcategory: dashboard
tags: [filters, dashboard, controls, navigation]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Controls that change what every widget on the page shows (date range,
workspace, segment) belong in one fixed bar above all widgets, never
scattered per-card, and never buried in a settings menu.

The recipe:

- Put date range, comparison period, and any page-level segment selector in a
  single horizontal bar directly under the page title, right-aligned or
  left-aligned consistently across every dashboard in the product.
- Keep it sticky on scroll so a user who scrolls to a lower widget can still
  see and change the active range without scrolling back up.
- Show the active state in plain language next to the control, not just
  inside it: "Last 30 days" as visible text, not a collapsed icon the user
  must click to reveal.
- Never duplicate the same filter control inside individual widgets unless
  that widget's data genuinely uses a different range than the page default
  — and if it does, label that widget explicitly as an exception.
- Persist the selection (URL param or saved preference) so refreshing or
  sharing a link doesn't silently reset it to a default range.

Why: when the range control lives in one place, the user forms a single
mental model of "what am I looking at" that applies to the whole page. Per-
widget filters fragment that model — the user has to check each card
individually to know what period it reflects, and dashboards that do this get
misread constantly, especially when a "last 7 days" card sits beside a
"last 30 days" card with no visual distinction.

Example: a sticky bar reading "Workspace: Acme  |  Range: Last 30 days  |
compared to previous 30 days" positioned directly below the page's H1.
Counter-example: each of six widgets carrying its own small date-picker icon
in its corner, each defaulting independently, so two cards silently show
different time windows with no visible label explaining why the numbers
disagree.
