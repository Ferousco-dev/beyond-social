---
id: screen-reader-and-aria-patterns-progressbar-loading-pattern
title: Progress bars, spinners, and aria-busy loading states
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, progressbar, loading, aria-busy, spinner]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A visual loading indicator conveys nothing to a screen reader by default; the
right ARIA depends on whether progress is measurable or indeterminate, and on
whether the loading region replaces content in place.

- Measurable progress (upload percentage, multi-step wizard): `role="progressbar"`
  with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, and either
  visible percentage text or an `aria-valuetext` giving a human phrase ("Step 2
  of 4") when the raw number alone wouldn't be meaningful.
- Indeterminate spinner (unknown duration): omit `aria-valuenow` entirely rather
  than setting it to 0 or a fake number — a present-but-static `aria-valuenow`
  reads as stalled progress, not "unknown." Pair with a visible or
  `aria-label`'d description of what's loading ("Loading results").
- When a region is being replaced by a spinner (a panel refetching data),
  set `aria-busy="true"` on that container for the duration and back to
  `"false"` on completion — this tells assistive tech to hold off announcing
  the region's interim mutations until the busy state clears, rather than
  narrating every intermediate DOM change.
- Pair the busy container with a `polite` live region announcing completion
  ("Results updated") rather than expecting the user to notice the spinner
  disappeared, since a spinner's removal from the DOM is not itself announced.
- Full-page loading states need a single, clear focus target once loading
  completes (e.g. move focus to the new content's heading); don't leave focus
  stranded on a now-removed spinner element.

Why: sighted users perceive loading via animation and completion via the
content simply appearing; screen reader users get neither cue unless the state
transitions are explicitly exposed through role, value, and busy attributes.

Example: `<div role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">60%</div>`.
Counter-example: a spinning CSS animation `<div>` with no role, no label, and
the results panel swapped in with no `aria-busy` or live-region announcement.
