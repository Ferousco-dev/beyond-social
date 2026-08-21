---
id: empty-loading-error-states-stale-while-revalidating
title: Background refetch should not repeat the initial loading state
category: product-pattern
subcategory: empty-loading-error-states
tags: [loading-state, caching, saas-dashboard, ux-heuristic]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A view that already has data from a previous fetch should never fall back to
its full loading skeleton when it silently refetches in the background; the
loading state belongs only to the first paint.

- On mount with cached data available, render the cached content immediately;
  never show a skeleton over data you already have.
- Represent the background refetch with a minimal indicator, a thin top-bar
  progress line, a subtle pulsing dot near a timestamp, or nothing visible at
  all if the refetch is fast and low-stakes.
- Swap in fresh data in place once it arrives, without a layout jump or a
  flash of empty state in between old and new.
- Reserve the full skeleton/spinner treatment for the state that has zero
  prior data to show, first load, first visit to a route, or a manually
  cleared cache.
- If the refetch fails, keep showing the stale data (it's still more useful
  than nothing) and surface the failure as a small "couldn't refresh" note,
  not a state that replaces the visible content.

Why: re-triggering the full loading UI on every background refresh punishes
users for the app being fast to cache and slow to reconfirm, and it makes an
otherwise snappy app feel like it's perpetually reloading itself. Treating
"I have stale data" and "I have no data" as the same state throws away the
main benefit of caching, which is that the user never has to wait twice for
the same screen.

Example: a dashboard shows last night's numbers instantly from cache on open,
with a small "Updating…" label near the header that disappears once fresh
numbers swap in, no skeleton, no flicker.
Counter-example: every time the tab regains focus, the dashboard clears its
current numbers and re-renders the full skeleton loading state while it
refetches, even though it had valid data a second ago.
