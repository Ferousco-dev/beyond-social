---
id: keyboard-and-focus-management-logical-tab-order
title: Keeping tab order matched to visual reading order
category: accessibility
subcategory: keyboard-and-focus-management
tags: [tab-order, dom-order, css-order, layout]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, landing-page, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Tab order follows DOM order by default, and CSS layout (flexbox `order`,
grid placement, absolute positioning) can visually rearrange content without
moving it in the DOM — the two drift apart silently unless checked.

- Author the DOM in the order you want Tab to follow first, then use CSS
  purely for visual placement; treat any visual reorder as a signal to
  double-check tab order, not assume CSS handled it.
- Never use positive `tabindex` values (`tabindex="2"`, `tabindex="3"`) to
  patch a mismatch — positive values create a second, competing order that
  every future addition to the page has to be manually numbered against,
  and it always eventually breaks.
- With CSS Grid or flexbox `order`, verify the tab sequence by physically
  tabbing through the page, not by reading the CSS — visual order and DOM
  order can look identical in a static screenshot and diverge under Tab.
- Multi-column layouts (a two-column form, a card grid) are a common trap:
  confirm whether the intended reading order is row-by-row or column-by-
  column, then match DOM order to that intent explicitly.
- Re-audit tab order after any responsive breakpoint change that reflows
  content into a different visual arrangement.

Why: a keyboard user has no peripheral vision of the whole layout the way a
mouse user does — they experience the page exactly in Tab order, so any gap
between what they see next and what focus lands on next reads as the
interface being broken.

Example: a two-column checkout form authored with the shipping fields
before billing fields in the DOM, matching the left-to-right reading order
the CSS grid displays them in.

Counter-example: a card grid where CSS `order` visually moves a "Featured"
card to the top-left, but its DOM position is last — tabbing through jumps
to the featured card only at the very end, after every other card.
