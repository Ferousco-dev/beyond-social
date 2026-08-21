---
id: screen-reader-and-aria-patterns-native-html-first-before-aria
title: Prefer native HTML over ARIA whenever it already does the job
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, native-html, semantics, screen-reader]
applicability:
  platforms: [web]
  productTypes: [landing-page, saas-dashboard, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

The first rule of ARIA is not to use it: a native element already ships keyboard
handling, focus management, and role/state exposure that a `<div>` plus ARIA
attributes has to reimplement by hand and will usually get wrong.

- `<button>` over `<div role="button" tabindex="0">`: native gets Enter/Space
  activation, focus, and disabled state for free; the div requires manual
  keydown handlers for both keys and a manual `aria-disabled` sync.
- `<a href>` over a clickable span: native gets "link" role, middle-click,
  open-in-new-tab, and status-bar preview automatically.
- `<label for>` / wrapping `<label>` over `aria-label` on a bare `<input>`: the
  native label also expands the click target and works without JavaScript.
- `<fieldset>` + `<legend>` over a styled div heading above a group of radios or
  checkboxes: the legend is announced as the group's name on every option.
- `<table>` with `<th scope>` over div-grids styled to look tabular: native
  table semantics let a screen reader announce row/column headers per cell.
- Reach for ARIA only to describe a widget with no native HTML equivalent
  (combobox, tree, tab panel) or to patch a genuine gap in native semantics.

Why: ARIA can only add or override the accessibility tree's semantics, it adds
none of the native interaction behavior; a role without matching keyboard
handling produces something that announces correctly but cannot actually be
operated, which is worse than plain unstyled HTML.

Example: `<button type="button" class="icon-btn">` for a clickable icon.
Counter-example: `<div class="icon-btn" role="button" onclick="...">` with no
`tabindex`, no keydown handler, and no focus style, unreachable by keyboard.
