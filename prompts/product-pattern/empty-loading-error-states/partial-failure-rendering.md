---
id: empty-loading-error-states-partial-failure-rendering
title: Show what succeeded even when part of the request failed
category: product-pattern
subcategory: empty-loading-error-states
tags: [error-state, partial-failure, saas-dashboard, ux-heuristic]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

When a view is composed of multiple independent data sources, one source
failing should never blank out the sources that succeeded, the failure needs
its own small footprint next to the content that loaded fine.

- Fetch independent widgets/sections with independent request boundaries
  (separate loading and error states per section), not one request whose
  failure blanks the whole page.
- Render successful sections normally and give the failed section a compact
  inline error in its own footprint, sized to that section, not the page.
- If a single list has some items that failed to hydrate (e.g., a linked
  thumbnail 404s), show the item with a fallback state for just that piece,
  not an error for the whole list.
- Distinguish "3 of 5 loaded, 2 failed, retry those 2" from a full-page error;
  offer a scoped retry that only re-requests the failed pieces, not everything.

Why: coupling unrelated data sources into one failure domain means the
reliability of the whole page becomes the reliability of its flakiest
dependency. Independent boundaries mean a single slow third-party widget
degrades gracefully instead of taking the entire experience down with it, and
it also localizes the user's frustration to the one thing that's actually
broken instead of making everything look broken.

Example: a dashboard renders four widgets in parallel; the revenue chart
fails to fetch and shows "Couldn't load revenue — Retry" in its own card while
the other three widgets render normally beside it.
Counter-example: the dashboard awaits `Promise.all()` across all four widget
fetches and renders one full-page error state if any single one rejects, so a
flaky third-party integration blanks out three widgets that had no problem.
