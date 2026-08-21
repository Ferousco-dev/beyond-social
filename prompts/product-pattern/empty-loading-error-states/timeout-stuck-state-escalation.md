---
id: empty-loading-error-states-timeout-stuck-state-escalation
title: Escalate a loading state into an explanation before the user assumes it's frozen
category: product-pattern
subcategory: empty-loading-error-states
tags: [loading-state, timeout, error-state, ux-heuristic]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Every loading state needs a defined threshold past which it stops being
"loading" and becomes "this is taking longer than expected," because users
mentally reclassify a stuck spinner as broken well before your request
actually times out.

- Set a threshold from real p95 latency for that operation, not a round
  number picked arbitrarily, if the operation normally finishes in 2s, escalate
  messaging around 5 to 8s, not 30.
- At the threshold, keep the spinner but add explanatory text under it, "Still
  working, this is taking longer than usual" rather than silently continuing
  to spin unchanged.
- At a second, longer threshold (or the actual request timeout), replace the
  spinner with an explicit choice: keep waiting, retry, or cancel, don't let
  the UI spin forever with no exit.
- Never let a loading state persist past its own timeout window with no
  visible change; if the request is going to fail, fail visibly the moment
  you know, not after the user has given up watching.

Why: users have no visibility into what "loading" actually means underneath
the UI, so their trust in a spinner decays on a timer set by their own
patience, not by your backend's actual behavior. Proactively narrating
"still working" before that patience runs out keeps the wait legible instead
of leaving the user to guess whether to reload, wait, or give up.

Example: a report export shows a plain spinner for the first 6 seconds, then
"Still generating your report, this can take up to a minute for large date
ranges," then at 60 seconds offers "Keep waiting / Cancel and retry."
Counter-example: the same export spins identically from second 1 through
second 90 with no change in messaging, so the user reloads the page at
second 20 assuming it's frozen, restarting the export from zero.
