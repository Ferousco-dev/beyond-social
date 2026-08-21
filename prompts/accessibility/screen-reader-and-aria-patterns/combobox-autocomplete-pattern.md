---
id: screen-reader-and-aria-patterns-combobox-autocomplete-pattern
title: The combobox pattern for search and autocomplete
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, combobox, autocomplete, aria-activedescendant]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

An input that opens a filtered suggestion list (search-as-you-type, tag picker,
address autocomplete) is the ARIA combobox pattern, and it is one of the widgets
most commonly implemented with the wrong attributes still functioning visually.

- The text input gets `role="combobox"`, `aria-expanded` reflecting whether the
  listbox is open, `aria-controls` pointing at the listbox id, and
  `aria-autocomplete="list"` (or `"both"` if it also inlines a suggested
  completion into the input value).
- The suggestion popup gets `role="listbox"`, and each suggestion
  `role="option"` with `aria-selected` reflecting highlight state.
- Keep DOM focus in the input the entire time; do not move focus into the
  listbox. Instead set `aria-activedescendant` on the input to the id of the
  currently highlighted option as Arrow Down/Up moves through the list — this
  is what lets the screen reader announce "suggestion 3 of 8, Lagos, Nigeria"
  without the user's typing cursor ever leaving the field.
- Enter selects the active option and closes the list; Escape closes the list
  without selecting and returns focus semantics to a plain textbox.
- Debounced network results must still update `aria-activedescendant` and the
  option count together — a stale `aria-activedescendant` pointing at a
  removed option id announces nothing and silently breaks selection.

Why: `aria-activedescendant` is what makes a single-focus-point widget behave
like a list for a screen reader without actually moving focus, which is the
only way autocomplete can announce list navigation while keeping the physical
keyboard cursor in the text field for continued typing.

Example: `<input role="combobox" aria-expanded="true" aria-controls="city-listbox" aria-activedescendant="opt-3">`.
Counter-example: a text input with a plain `<ul>` of clickable suggestions below
it, mouse-only, no roles, arrow keys do nothing.
