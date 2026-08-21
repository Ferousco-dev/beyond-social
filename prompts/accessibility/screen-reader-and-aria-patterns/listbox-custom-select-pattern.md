---
id: screen-reader-and-aria-patterns-listbox-custom-select-pattern
title: Custom dropdown selects vs the native select element
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, listbox, select, dropdown, native-html]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A native `<select>` already gets correct keyboard handling, type-ahead, and
mobile OS picker UI for free; only replace it with a custom `listbox` when the
design genuinely needs something native select cannot do (rich option content
with images, multi-line options, inline icons, live filtering).

- If custom is justified: trigger button gets `aria-haspopup="listbox"` and
  `aria-expanded`; the popup gets `role="listbox"` with `aria-labelledby` naming
  it; each option gets `role="option"` and `aria-selected`.
- Move focus into the listbox on open (unlike combobox, a listbox trigger-plus-
  popup pattern does move DOM focus), with Arrow Up/Down moving selection and
  Enter/Escape closing it; type-ahead (typing "m" jumps to the next option
  starting with M) is expected behavior users will test for.
- For multi-select, use `aria-multiselectable="true"` on the listbox and
  `aria-selected` per option; do not fake multi-select with checkboxes inside a
  single-select listbox role, which sends two conflicting semantic signals.
- When closed, the trigger button's accessible name should reflect the current
  selection ("Sort by: Price, low to high"), not a static label, so a screen
  reader user landing on it via heading/landmark navigation gets the state
  without opening it.
- Styling a native `<select>` (custom arrow icon, border, font) is almost always
  achievable with modern CSS and costs none of this implementation risk.

Why: native `<select>` behavior is deeply learned muscle memory (type-ahead,
Home/End, closing on blur); a hand-rolled listbox that gets even one of these
details wrong reads as broken rather than merely different, because users bring
select-specific expectations to anything visually shaped like a dropdown.

Example: `<select><option>Newest first</option>...</select>`, styled with `appearance: none` and a custom chevron.
Counter-example: a custom listbox with mouse-only option clicks, no
`aria-selected`, and Enter that does nothing.
