---
id: empty-loading-error-states-offline-vs-server-error
title: Tell the user whether their connection or the backend is the problem
category: product-pattern
subcategory: empty-loading-error-states
tags: [error-state, connectivity, mobile-app, ux-heuristic]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

An error state that means "your device is offline" needs a different message,
icon, and remedy than one that means "our servers are down," because the
user's next action depends entirely on which is true.

- Detect offline via `navigator.onLine` plus an actual failed fetch (the
  browser flag alone is unreliable), and route to a distinct offline state:
  a muted, non-alarming tone, a signal/wifi-off icon, copy like "You're
  offline, we'll retry when you're back."
- Auto-reconnect and auto-retry queued actions the moment connectivity
  returns, using the `online` event, so the user doesn't have to manually
  retry once their network is back.
- Route true backend failures (5xx, or a successful connection that gets an
  error response) to the standard server-error treatment, with its own icon
  and copy, "Something went wrong on our end."
- Never show a generic "Something went wrong" for offline; it sends the user
  down a debugging path (retrying, reloading, clearing cache) for a problem
  that only resolves when they reconnect to wifi or cellular.
- On mobile specifically, persist queued actions locally so reconnection can
  replay them rather than losing what the user tried to do while offline.

Why: offline and server-down look identical from inside a generic error
boundary, both are "the request failed," but they demand opposite user
behavior. Telling someone to "try again later" when they're on an airplane
with no signal is useless, and telling someone their wifi is fine when the
server actually returned a 500 sends them chasing a router reset that fixes
nothing.

Example: a mobile app shows a persistent slim banner reading "You're offline"
with a wifi-off icon the instant `navigator.onLine` flips false, and it
auto-dismisses the moment the `online` event fires and a health check
succeeds.
Counter-example: the same app shows a full-page "Oops, something went wrong,
please try again" error screen whenever any fetch fails, identical whether
the phone has no signal or the API server is returning 500s.
