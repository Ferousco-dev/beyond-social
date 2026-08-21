---
id: dashboard-layouts-drill-down-navigation
title: Drill-down from summary card to detail view
category: layout
subcategory: dashboard
tags: [navigation, dashboard, drill-down, interaction]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Every top-line stat card should be a door to the exact filtered detail view
that explains it, not a dead end the user has to manually re-navigate from.

The recipe:

- Make the entire card clickable (not just a small "view details" link
  buried in a corner), and land the click on a detail page pre-filtered to
  match the card's exact scope and time range.
- Preserve context across the click: if the card showed "Failed renders: 42
  this week," the destination table opens already filtered to failed status
  and the same week, not the full unfiltered job list.
- Show a visible breadcrumb or back affordance on the detail view naming
  where it came from ("Renders > Failed, last 7 days"), so the path back to
  the dashboard is obvious.
- Reserve drill-down for cards that have a real underlying detail view. A
  card with no deeper data behind it (a static config value) shouldn't
  pretend to be clickable with a hover state that leads nowhere useful.

Why: the top-line number's entire purpose is to prompt a question ("why did
this happen"), and if answering that question requires the user to manually
reconstruct the same filters in a separate table view, the dashboard has
generated the question without providing the path to the answer, which is
the more expensive half of the interaction.

Example: clicking a "Failed renders: 42" card opens the jobs table with
status=failed and range=last-7-days already applied, with a breadcrumb
reading "Dashboard > Failed renders."
Counter-example: the same card links to the fully unfiltered jobs table,
leaving the user to manually find and apply a status filter and re-set the
date range to match what the card had already shown them.
