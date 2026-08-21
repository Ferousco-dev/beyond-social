---
id: buttons-and-ctas-mobile-fab
title: Floating action button placement
category: component
subcategory: buttons-and-ctas
tags: [buttons, mobile, fab, thumb-zone]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A floating action button (FAB) earns its persistent, elevated position only
for the single most frequent creation action in the app — and it needs to sit
where a thumb actually reaches, not just where it looks balanced.

The recipe:

- Use a FAB for exactly one primary action per screen (e.g. "compose," "new
  task"). An app with two or three FAB-worthy actions needs a different
  pattern (a tab bar action, a speed-dial FAB, or an inline button) — stacking
  multiple FABs defeats the "one obvious next action" purpose.
- Anchor position: bottom-right for right-handed-majority markets, respecting
  safe-area insets so it never overlaps the home-indicator gesture zone on iOS
  or the navigation bar on Android.
- Diameter of roughly 56dp (Material spec) with at least 16dp margin from
  screen edges, keeping it inside the thumb-reachable arc for one-handed use
  on typical phone sizes.
- On scroll, either keep the FAB fixed or shrink it to an icon-only "mini"
  state that expands back on scroll-stop — never let it obscure content
  permanently or get pinned over other actionable elements like a bottom nav.
- Give it a shadow strong enough to read as elevated above content (it's
  called "floating" for a reason) but consistent with the elevation scale
  used elsewhere in the product, not an arbitrary one-off shadow.

Why: the FAB pattern trades screen real estate for constant access to one
action, which is only worth the cost if that action is genuinely the app's
primary verb. Misplacing it outside the thumb zone, or using several FABs
that compete, reintroduces the exact ambiguity the pattern exists to remove.

Example: a notes app with a single bottom-right FAB, plus icon, that expands
to a compose screen; it shrinks to a dot while the list is being scrolled.

Counter-example: two FABs stacked in the same corner ("new note" and "new
folder"), forcing the same one-obvious-action decision the pattern was
supposed to eliminate.
