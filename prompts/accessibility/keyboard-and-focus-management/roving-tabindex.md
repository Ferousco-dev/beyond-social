---
id: keyboard-and-focus-management-roving-tabindex
title: Roving tabindex for composite widgets
category: accessibility
subcategory: keyboard-and-focus-management
tags: [roving-tabindex, composite-widget, toolbar, tabs]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A toolbar, tab list, or menu with many items should be one stop in the
page's Tab order, with arrow keys moving between its items — not a dozen
separate Tab stops.

- Give exactly one item `tabindex="0"` at a time (the current/active one);
  every other item in the group gets `tabindex="-1"`.
- Move the `tabindex="0"` to the newly active item and call `.focus()` on it
  in response to Arrow Left/Right (or Up/Down for vertical groups) — Tab and
  Shift+Tab exit the whole group in one step, forward or backward.
- Wrap or clamp at the ends per widget convention: tab lists typically wrap
  (last to first), while some toolbars stop at the boundary — match the
  ARIA Authoring Practices pattern for the specific widget role you're
  implementing.
- Pair it with the matching ARIA role (`role="tablist"`/`"tab"`,
  `role="toolbar"`, `role="menu"`/`"menuitem"`) — roving tabindex is a
  keyboard behavior, not a substitute for correct semantics.
- Update `aria-selected` or `aria-checked` alongside the tabindex move so
  assistive tech announces the new active item, not just moves focus
  silently.

Why: a toolbar with 10 buttons each getting a normal Tab stop forces a
keyboard user through 10 key presses to get past it; roving tabindex makes
the group one Tab stop with fast, direct arrow-key navigation inside it,
matching how a mouse user scans the group at a glance.

Example: a tab list where Tab enters on the active tab, Right Arrow moves
`tabindex="0"` and focus to the next tab, and Tab again exits straight to
the panel content.

Counter-example: giving every tab a plain `tabindex="0"` — arrow keys do
nothing, and Tab must be pressed once per tab just to get through the list,
with no way to jump directly to the active one.
