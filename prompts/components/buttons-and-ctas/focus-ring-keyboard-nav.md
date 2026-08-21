---
id: buttons-and-ctas-focus-ring-keyboard
title: Visible focus states for keyboard navigation
category: component
subcategory: buttons-and-ctas
tags: [buttons, accessibility, keyboard, focus]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Every button needs a focus indicator that is visible, distinct from hover, and
never removed with a blanket `outline: none` — keyboard and switch-device
users navigate by focus alone and have no cursor to tell them where they are.

The recipe:

- Use `:focus-visible` rather than `:focus` so the ring appears for keyboard
  tabbing but not for every mouse click, matching how sighted mouse users
  actually expect buttons to look.
- Make the ring a distinct color/shape from the hover state — a 2px outline
  offset by 2px from the button edge, in a color with at least 3:1 contrast
  against both the button and the page background, per WCAG 2.4.11.
- Preserve natural DOM tab order; only use `tabindex` to fix a broken order,
  never to reorder for purely visual layout reasons, since that desyncs the
  visual flow from the navigable flow.
- Ensure focus is visible in both light and dark themes — a ring tuned only
  for light backgrounds can disappear entirely in dark mode.
- When a button opens a modal or menu, move focus into that new context and
  restore it to the trigger button on close, so a keyboard user is never
  silently returned to the top of the page.

Why: `outline: none` without a replacement is the single most common
accessibility regression in custom button components — it looks clean to a
mouse user in a design review and makes the interface unusable to anyone
tabbing through it, which includes power users navigating fast, not only
assistive-tech users.

Example: a solid-fill primary button with a 2px offset outline in a
high-contrast accent color that appears only via `:focus-visible`.

Counter-example: a global `* { outline: none; }` reset with no replacement
focus style, leaving keyboard users with no way to see where they are on the
page.
