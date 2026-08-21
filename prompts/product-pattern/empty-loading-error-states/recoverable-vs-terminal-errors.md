---
id: empty-loading-error-states-recoverable-vs-terminal-errors
title: Distinguish errors a retry can fix from errors it can't
category: product-pattern
subcategory: empty-loading-error-states
tags: [error-state, retry, ux-heuristic, conversion]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Before writing an error's copy or CTA, classify the underlying failure as
recoverable (retrying with no changes might succeed) or terminal (retrying
identically will fail identically), because the two need different actions.

- Recoverable (timeout, 502/503, flaky connection, rate limit that has since
  cleared): show a Retry button as the primary action, and word the copy
  around transience, "Connection dropped, try again."
- Terminal (404, 403/permission denied, validation rejection, content policy
  block, expired resource): do not show a bare Retry button, since it will
  fail again and teach the user the button is broken. Offer the actual
  resolving action instead, "Ask an admin for access," "Edit and resubmit,"
  "Go back to the previous step."
- Ambiguous failures (a generic 500 with no error code) should default to
  recoverable treatment with a visible retry, but the copy should not promise
  a specific cause it cannot verify, "Something went wrong on our end, try
  again" rather than inventing a diagnosis.
- Log the classification server-side per error code so the client can render
  correctly without guessing from a string match on the message.

Why: a Retry button on a terminal error is worse than no button, because the
user clicks it, watches it fail again, and now distrusts every retry
affordance in the product, including the ones that would have worked. Correct
classification is what makes "click to retry" a trustworthy pattern at all.

Example: a 429 rate-limit error shows "Too many requests, retrying
automatically in 12s" with a visible countdown, no manual button needed since
the system already knows when retry will succeed.
Counter-example: a 403 permission error shows a generic "Retry" button that,
when clicked, immediately fails again with the identical 403, because the
underlying permission was never going to change.
