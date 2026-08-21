---
id: screen-reader-and-aria-patterns-aria-hidden-and-decorative-content
title: aria-hidden, decorative icons, and hiding content correctly
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, aria-hidden, decorative, sr-only, icons]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site, e-commerce, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Hiding something from screen readers and hiding something from sighted users
are different operations with different attributes, and mixing them up either
leaves decorative noise in the announcement stream or hides content that
should have stayed available.

- Purely decorative elements (an icon next to text that already says the same
  thing, a background pattern `<svg>`, a spacer image): `aria-hidden="true"`
  removes them from the accessibility tree while they stay visible. Icon
  libraries almost always need this by default, since most ship no inherent
  label.
- Visually-hidden-but-meaningful text (an icon-only button's label, a "skip to
  content" link, extra context for a stat number): use a clipping technique
  (the classic `sr-only` class: absolute position, 1px size, clipped, not
  `display:none`) — never `aria-hidden`, which would remove it from both.
- Never put `aria-hidden="true"` on an element that contains a focusable
  descendant (a link or button) — the element becomes reachable by Tab but
  invisible to the screen reader landing on it, a state with no sighted
  equivalent and no accessible name to announce.
- `hidden` (the HTML attribute) or `display:none` removes something from both
  the visual and accessibility tree together — the right choice for content
  that's genuinely not present right now (a closed accordion panel, an inactive
  tab panel), not a substitute for `aria-hidden`.
- Redundant duplicate text meant only for search engines or visual layout
  (e.g. a `<span>` repeating a heading for a CSS trick) should be `aria-hidden`
  if it stays visually present, or removed from the DOM if it doesn't need to
  render at all.

Why: the accessibility tree and the visual render tree are two independent
outputs from the same DOM; conflating "invisible" with "hidden from AT" (or the
reverse) produces either duplicate noisy announcements or unreachable-but-
visible controls, both of which are worse than doing nothing.

Example: `<button><svg aria-hidden="true">...</svg><span class="sr-only">Notifications</span></button>`.
Counter-example: `<div aria-hidden="true"><button>Dismiss</button></div>` — a
real button, focusable by Tab, completely silent when it receives focus.
