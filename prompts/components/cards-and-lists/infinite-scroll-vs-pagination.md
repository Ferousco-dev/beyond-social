---
id: cards-and-lists-infinite-scroll-vs-pagination
title: Infinite scroll versus pagination
category: component
subcategory: cards-and-lists
tags: [pagination, infinite-scroll, navigation, lists]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Pick infinite scroll for open-ended browsing and numbered pagination for task-oriented work where the user needs to return to, or cite, a specific position — never infinite-scroll a list users have to come back to.

- Infinite scroll fits discovery: an asset library or template gallery, where the goal is "find something interesting" and momentum matters more than position.
- Numbered pagination fits work: admin tables, search results being compared across sessions, anything a user needs to cite ("row 40," "page 3") or return to after leaving.
- Infinite scroll needs a real end state — a visible "you've reached the end of 340 items" message, not a spinner that never resolves and not a silent stop with no feedback at all.
- Infinite scroll breaks the browser back button and makes a footer functionally unreachable; if either matters, use click-to-load-more (a bounded, manual version of infinite scroll) instead of auto-triggering on scroll.
- Always preserve scroll position and loaded-page count when the user navigates away and back — for example opening an item, then pressing back. Respawning the list at page one on return is one of the most common infinite-scroll regressions.

Why: the two patterns optimize for different things. Infinite scroll optimizes for momentum, minimizing friction to "just keep looking." Pagination optimizes for addressability — a fixed reference point the user can return to, share, or cite exactly. The choice should follow whether the task benefits more from uninterrupted flow or from a stable position, not from which pattern is currently trendier.

Example: "asset gallery: auto-load-more on scroll, 'You've seen all 340 templates' shown at the end."
Counter-example: an infinite-scrolling invoice table where support agents lose their place every time they open an invoice and hit back, forcing a full re-scroll on every lookup.
