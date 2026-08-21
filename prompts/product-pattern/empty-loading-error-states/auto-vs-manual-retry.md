---
id: empty-loading-error-states-auto-vs-manual-retry
title: Retry silently for infrastructure blips, ask permission for anything with side effects
category: product-pattern
subcategory: empty-loading-error-states
tags: [error-state, retry, loading-state, ux-heuristic]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Whether a failed request retries automatically or waits for the user to click
a button should be decided by whether repeating it is safe and cheap, not by
developer convenience.

- Auto-retry with exponential backoff, capped at 2 to 3 attempts, for
  idempotent GETs and known-transient signals (network drop, 502/503, a
  timeout on a read-only request). Show a subtle "reconnecting…" indicator
  during backoff, not a spinner reset each attempt.
- Never auto-retry a non-idempotent mutation (POST that creates a resource,
  payment submission, an action with side effects) without a way to detect the
  first attempt already partially succeeded; silently double-firing a create
  or a charge is worse than the original failure.
- For mutations, surface the failure and put a manual Retry in the user's
  hands so they consciously choose to resubmit, and disable the button while
  the retry is in flight to prevent a duplicate double-click.
- After auto-retries are exhausted, fall back to a manual, visible retry state
  rather than looping forever or failing silently.
- Log auto-retry counts; if a given endpoint auto-retries constantly in
  production, that's a reliability signal, not something to paper over
  further at the UI layer.

Why: automatic retry exists to absorb noise the user shouldn't have to see,
but applying it to actions with side effects turns a transient glitch into a
correctness bug, duplicate orders, duplicate emails, double-charged cards.
The line is drawn by idempotency, not by which failures are annoying to show.

Example: a dashboard's read-only widget fetch retries twice automatically
with backoff before showing a manual retry button; a "Submit payment" failure
never auto-retries and instead shows "Payment failed, try again" with a
disabled-while-submitting button.
Counter-example: a checkout form auto-retries a failed order-creation POST
three times in the background with no user visibility, and two of the three
attempts actually succeeded server-side, creating duplicate orders.
