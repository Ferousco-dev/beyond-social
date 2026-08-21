---
id: empty-loading-error-states-error-severity-tiers
title: Match error surface to blast radius, not to error existence
category: product-pattern
subcategory: empty-loading-error-states
tags: [error-state, severity, visual-hierarchy, saas-dashboard]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

An error's visual weight should scale with how much of the screen it disables,
not with how alarming the underlying failure sounds to an engineer.

- Field-level (inline, red text under the input): the error blocks only that
  field; the rest of the form stays usable. Never dim or disable surrounding
  fields for a single validation failure.
- Toast/snackbar: a background action failed but the current view is still
  valid and usable (an autosave failed, a like didn't register). Auto-dismiss,
  offer undo or retry inline in the toast itself.
- Inline panel/banner (within the component, page still navigable): the
  component the user was looking at can't render, but the rest of the page
  (nav, sibling widgets) still works. A dashboard chart panel gets its own
  "couldn't load this chart, retry" box; the KPI cards above it stay alive.
- Full-page/modal takeover: the entire view is unusable (auth expired, route
  failed to resolve, catastrophic app error). Reserve this for when there is
  truly nothing else on screen for the user to do.
- Never use a full-page takeover for a single failed API call inside an
  otherwise-functional page; it destroys everything the user could still do.

Why: severity mismatch trains users to either panic at routine issues or
ignore serious ones. A full-screen red error for a failed avatar upload
teaches users that errors are catastrophic and to distrust the whole app; a
silent toast for a payment failure under-communicates real risk.

Example: a failed chart fetch on an analytics dashboard shows an inline panel
reading "Couldn't load this chart — Retry" inside the chart's own card,
KPI tiles and nav unaffected.
Counter-example: the same failed chart fetch triggers a full-screen modal with
a warning icon and "Something went wrong," blocking access to every other
widget on the dashboard that loaded fine.
