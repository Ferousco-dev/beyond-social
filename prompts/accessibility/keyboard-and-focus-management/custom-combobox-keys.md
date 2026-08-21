---
id: keyboard-and-focus-management-custom-combobox-keys
title: Keyboard contract for a custom combobox or dropdown
category: accessibility
subcategory: keyboard-and-focus-management
tags: [combobox, dropdown, keyboard, custom-widget]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A custom-built select/combobox replaces the native `<select>`'s free
keyboard support, so it must reimplement the exact key contract users
already expect, not an approximation of it.

- Down Arrow on a closed combobox opens the popup and moves to the first
  (or currently selected) option; Up Arrow opens it to the last option.
- Up/Down Arrow inside the open popup move the active-descendant highlight
  without closing the popup or changing the committed value yet.
- Enter commits the highlighted option and closes the popup, returning
  focus to the combobox input/trigger. Escape closes the popup without
  changing the value and returns focus the same way.
- Type-ahead: typing a letter jumps to the next option starting with that
  letter (repeated presses cycle matches) — this is expected even in
  non-searchable dropdowns, not just searchable comboboxes.
- Keep focus on the input/trigger element throughout — use
  `aria-activedescendant` to indicate the highlighted option rather than
  moving actual DOM focus into the list, so a screen reader continues
  announcing from a stable element.
- Never require a mouse to reach an option that keyboard navigation can
  visually highlight but not select — every visible interactive state must
  have a keyboard path to it.

Why: users bring an unconscious keyboard contract from every native
`<select>` and every other combobox they've used; a custom implementation
that changes any part of it — Enter not committing, Escape closing the whole
form instead of the popup — reads as a bug even when the visual design is
otherwise correct.

Example: a country-select combobox where typing "g" the first time
highlights "Germany" and typing "g" again cycles to "Ghana".

Counter-example: a combobox where Arrow Down inside the open list moves
actual DOM focus onto each `<li>`, so a screen reader announces "list item"
repeatedly instead of the combobox's live selection state, and Escape
closes the entire form instead of just the popup.
