---
id: onboarding-and-empty-state-copy-skeleton-vs-empty-timing
title: A skeleton loader is never allowed to flash the empty-state copy first
category: copywriting
subcategory: onboarding-and-empty-state-copy
tags: [loading-state, skeleton, empty-state, timing]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

An empty-state message has no business rendering before the app has confirmed
data actually doesn't exist, so any screen that fetches data on load must show
a content-shaped skeleton, or nothing, during the fetch, and switch to true
empty-state copy only once the response confirms zero items.

- Gate empty-state copy behind a loaded-and-confirmed-zero condition, never
  behind an initial "data is undefined" state. These are different states in
  the code and must be different states on screen.
- Use a skeleton that matches the shape of real content, card outlines, not a
  spinner, so the transition from loading to loaded doesn't jump the layout.
- Set a minimum skeleton duration only if the real fetch is often faster than
  a perceptible flash, under roughly 150ms. Otherwise let it end exactly when
  data arrives; don't pad it artificially.
- If the fetch fails outright, show a distinct error state, not the empty
  state and not an infinite skeleton.
- Test this on a throttled connection specifically. On a fast local network,
  the incorrect empty-then-populated flash is invisible and easy to ship
  without noticing.

Why: a user who sees "No videos yet" for even a quarter-second before their
actual videos pop in gets a small, repeated jolt of doubt about whether their
work is safe. On a slow connection, that flash can last long enough to be
read and half-believed before the real content arrives.

Example: card-shaped gray placeholders for roughly 600ms, replaced by either
real thumbnails or, only after the fetch resolves to zero, the true empty
state.
Counter-example: rendering "You have no videos" immediately on component
mount, before the API call that will actually populate the list has returned.
