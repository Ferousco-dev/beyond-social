---
id: empty-loading-error-states-quota-and-rate-limit-state
title: Quota exhaustion is a distinct state from a generic error, treat it as one
category: product-pattern
subcategory: empty-loading-error-states
tags: [error-state, quota, conversion, saas-dashboard]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Running out of credits, seats, or usage quota is not a failure, it's an
expected business event, and rendering it through the same red-icon error
component as a broken request undersells the actual next step, which is
almost always "buy more" or "wait for reset," not "retry."

- Give quota exhaustion its own visual language, distinct from failure red:
  a neutral or brand-colored treatment, not a warning triangle, since nothing
  actually broke.
- State the specific limit and when it resets or how to raise it: "You've
  used all 10 video credits this month, resets in 14 days" or "Upgrade for
  more credits," never a bare "Limit reached."
- Put the resolving action (upgrade, buy credits, wait) as the primary CTA in
  the state itself, at the point of blockage, not buried in account settings
  the user has to go find.
- Show quota state proactively before the block, a low-balance warning at
  80% used, so hitting zero mid-task is never a surprise.
- Distinguish a hard block (feature fully disabled until quota resets or is
  purchased) from a soft warning (feature still works, degraded, e.g. lower
  resolution) in both copy and visual weight.

Why: quota states sit at a real monetization moment, the user wants to keep
going and there's a legitimate paid path to let them. Treating it as an error
frames a purchase opportunity as a system failure, which reads as punitive
and pushes the user toward frustration or churn instead of the upgrade the
product actually wants them to consider.

Example: a video generation attempt that would exceed the monthly credit
allotment shows "You're out of credits for this month, resets in 9 days —
Buy more credits" with a primary button, rendered in the product's brand
color, not error red.
Counter-example: the same blocked attempt shows a generic red error toast
reading "Request failed" with no explanation that it was a quota limit, so
the user assumes the product is broken and contacts support instead of
buying credits.
