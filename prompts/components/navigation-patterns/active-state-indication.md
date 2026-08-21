---
id: navigation-patterns-active-state-indication
title: Making the current location unambiguous in nav chrome
category: component
subcategory: navigation
tags: [navigation, active-state, accessibility, sidebar]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

The active item in any nav pattern needs at least two redundant visual signals,
not one, so location is legible under color-blindness, low contrast
environments, and quick glances alike.

- Combine at minimum: a background fill or left/bottom accent bar, plus a
  weight or color change on the icon/label (never rely on color alone per
  WCAG 1.4.1).
- In a sidebar, use a full-row background tint plus a 2-3px accent bar on the
  leading edge — the bar alone is too thin to notice in peripheral vision, the
  fill alone can be too subtle at low contrast.
- In a tab bar, pair icon fill-state change (outline to solid) with a label
  color shift and, optionally, a small dot or bar above the active icon —
  never color shift alone, since color-only cues fail roughly 1 in 12 men with
  color vision deficiency.
- Set `aria-current="page"` on the active nav link programmatically, not just
  visually, so assistive tech announces current location.
- When secondary nav exists, both primary and secondary layers need their own
  independent active-state styling — a user should be able to tell "which
  section" and "which sub-view" from the chrome without reading page content.

Why: navigation chrome is scanned peripherally, not read closely — the eye
needs a shape or contrast difference it can catch without fixating, which is
why single, low-contrast color changes routinely fail usability testing even
though they look fine to the designer who chose them on a calibrated monitor.

Example: "active sidebar item: 8% opacity brand-color fill across the row, 3px
solid accent bar on the left edge, icon and label switch from gray-500 to
gray-900."

Counter-example: an active tab distinguished only by the label turning from
gray to a slightly different shade of gray at 3:1 contrast — invisible in
sunlight and to colorblind users.
