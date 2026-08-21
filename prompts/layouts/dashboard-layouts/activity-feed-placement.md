---
id: dashboard-layouts-activity-feed-placement
title: Placing the recent activity feed
category: layout
subcategory: dashboard
tags: [activity-feed, dashboard, navigation, secondary-content]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A recent-activity or audit-log feed is reference content, not headline
content, and belongs in a fixed side rail or a collapsed secondary tab, never
competing for space in the primary metric grid.

The recipe:

- On desktop, place the activity feed in a fixed-width right rail (roughly
  280-320px) running alongside the main widget grid, scrolling
  independently so a long feed doesn't push the primary metrics further down
  the page.
- On mobile, collapse the feed into its own tab or an expandable section
  below the main metrics, never inline between stat cards where it would
  interrupt the priority-ordered scroll.
- Cap the default view to the most recent 5-8 events with a clear "view all
  activity" link to a full log page; an unbounded feed inline on the
  dashboard turns an at-a-glance page into an infinite scroll.
- Each entry needs an actor, an action verb, an object, and a relative
  timestamp in that order ("Maya generated a video, 2m ago"), not a raw log
  line or a system-generated sentence fragment.

Why: activity feeds answer "what just happened," a fundamentally different
question from the metric grid's "where do things stand," and a user
scanning for the second question shouldn't have to visually filter out a
chronological list to find the numbers; separating them into distinct regions
lets each serve its own scan pattern without interference.

Example: a 300px right rail titled "Recent activity" listing the last six
events with relative timestamps, independently scrollable from the main
column.
Counter-example: activity log entries inserted as full-width rows between
stat cards in the main grid, breaking the card-based scan pattern and pushing
the trend chart and table further down the page than their priority
warrants.
