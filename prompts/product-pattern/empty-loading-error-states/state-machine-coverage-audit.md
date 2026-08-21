---
id: empty-loading-error-states-state-machine-coverage-audit
title: Design all states before any state, not the happy path plus afterthoughts
category: product-pattern
subcategory: empty-loading-error-states
tags: [state-machine, design-process, ux-heuristic, saas-dashboard]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Every view that fetches or mutates data has five states, not one: idle/success,
loading, empty, error, and partial. Shipping only the success state and
patching the rest post-launch is why production apps show raw JSON errors or
infinite spinners two years in.

- Before building the happy-path UI, list all five states for the view in a
  table: what renders, what copy shows, what actions are available.
- Treat the four non-success states as first-class design deliverables, not
  engineering fallbacks improvised at implementation time.
- For views with pagination or filters, redo the table for "no results after
  filtering" separately from "no data has ever existed here"; they need
  different copy and different actions even though both render zero rows.
- Include state transitions in the review: what does the screen do the moment
  loading resolves into error, and does anything flash or jump.

Why: state coverage gaps compound because they are invisible in a design file
that only shows the success mockup, and they surface exactly when a real user
hits real conditions (slow network, empty account, expired session) that a
demo never exercises. Treating the four states as equal citizens in the design
process is the only reliable way to catch the gap before a support ticket does.

Example: a design review checklist item reads "loading / empty / error /
partial states specified and approved" alongside "success state approved,"
blocking handoff until both are checked.
Counter-example: a Figma file with one polished dashboard frame and a sticky
note that says "handle loading/error in code," leaving the actual copy,
layout, and iconography for those states to whichever engineer implements it
that sprint.
