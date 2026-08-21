---
id: navigation-patterns-fab-tab-bar-placement
title: Placing a floating action button around a bottom tab bar
category: component
subcategory: navigation
tags: [navigation, tab-bar, fab, mobile]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.83
---

A floating action button (FAB) and a bottom tab bar compete for the same
thumb-reachable zone; resolve the conflict by picking one primary "create"
mechanism, not by stacking both on screen at once.

- Prefer folding create actions into the tab bar itself as a distinct, visually
  elevated center item (larger icon, brand-color fill, slightly raised) rather
  than floating a separate FAB above the bar — one nav layer beats two
  overlapping ones.
- If a true floating FAB is required (Android Material convention, or a
  screen-specific action like "add item" on a list page), anchor it clear of
  the tab bar with at least 16px of breathing room above the bar's top edge,
  never overlapping the bar or obscuring the last list item's tap target.
- A FAB should never appear on every screen if its action is not universally
  relevant — a "compose" FAB on a Settings screen with nothing to compose is
  dead chrome; scope FABs to the screens where the action applies.
- Do not place a FAB directly above a tab bar item — the visual stacking
  confuses which control governs which tap target, especially for the tab
  directly beneath it.
- Choose one, consistently, across the whole app: either the tab bar's center
  item is the create action everywhere, or FABs appear contextually per-screen
  — never both patterns for the same underlying action in different parts of
  the app.

Why: a FAB floating just above a tab bar visually implies it belongs to that
bar, but functionally it usually governs page-specific content, not global
navigation — the ambiguity costs users a mis-tap or a moment of uncertainty
that a single elevated tab-bar item avoids entirely.

Example: "tab bar: Home, Search, [+ elevated center button for Create], Inbox,
Profile — no separate floating FAB anywhere in the app."

Counter-example: a round FAB hovering 4px above the tab bar's top edge,
partially covering the Notifications tab's label on smaller phones.
