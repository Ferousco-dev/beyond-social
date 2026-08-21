---
id: dashboard-layouts-skeleton-loading-states
title: Skeleton loading for asynchronous widgets
category: layout
subcategory: dashboard
tags: [loading, dashboard, performance, skeleton]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Each widget on a dashboard fetches its own data and should show its own
loading state shaped like its own eventual content, not a page-wide spinner
that blocks every widget on the slowest one.

The recipe:

- Build the skeleton from the same grid cell the real widget will occupy:
  same width, same height, same internal layout (label bar, number block,
  sparkline strip) — the page must not reflow when data arrives.
- Stagger nothing: every widget starts loading immediately and independently,
  so a fast widget (a cached stat card) can finish and render while a slow
  one (a heavy aggregation query) is still loading.
- Use a subtle shimmer or pulse, not a spinning icon, on the skeleton shapes
  themselves — a spinner communicates "wait," a shaped skeleton communicates
  "this is what's coming," which reduces perceived wait time even when actual
  load time is identical.
- Time out individually per widget (e.g. 8-10 seconds) and fall back to an
  inline error with a retry action scoped to that one card, never a full-page
  failure for one slow query.

Why: a single full-page spinner ties the whole dashboard's perceived speed to
its single slowest query, and it throws away the layout information the user
already has (which regions are stat cards vs charts vs tables). A skeleton
that mirrors the final layout lets the user start orienting to the page
structure before any data has actually loaded.

Example: a stat card skeleton showing a gray label-width bar, a larger gray
value-width bar, and a flat gray sparkline strip, matching the loaded card's
exact proportions.
Counter-example: a single centered spinner replacing the entire widget grid
until every widget's data has returned, so a one-second stat card query waits
on an eight-second table query before anything is visible.
