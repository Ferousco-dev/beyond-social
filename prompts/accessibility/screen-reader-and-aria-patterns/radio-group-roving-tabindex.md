---
id: screen-reader-and-aria-patterns-radio-group-roving-tabindex
title: Custom radio groups and roving tabindex
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, radiogroup, roving-tabindex, keyboard-navigation]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, onboarding, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A set of custom radio buttons (segmented controls, plan-selector cards, icon
pickers) needs one shared container role and a single-tab-stop navigation model,
not N independently tabbable options.

- Wrap the set in `role="radiogroup"` with an `aria-label` or
  `aria-labelledby` naming the group ("Billing cycle"), and give each option
  `role="radio"` with `aria-checked`.
- Only one radio in the group has `tabindex="0"` at a time (the checked one, or
  the first if none is checked); every other radio has `tabindex="-1"`. This is
  "roving tabindex": Tab enters and exits the group once, Arrow keys move the
  roving `tabindex="0"` and selection between options inside it.
- Arrow Left/Up moves to the previous option, Arrow Right/Down to the next, with
  wraparound at the ends; Home/End jump to first/last. Selecting an option
  updates its `aria-checked`, clears the others, and moves the roving tabindex.
- Do not let Tab move between individual options — that breaks the single native
  radio-group convention every screen reader user already expects.
- Mouse and touch selection must update the same state as keyboard selection;
  do not maintain separate logic paths that can drift out of sync.

Why: native radio inputs already behave this way (Tab visits the group once,
arrows move within it); a custom implementation that makes Tab step through
every option multiplies keystrokes and breaks the muscle memory screen reader
users rely on.

Example: a "Monthly / Annual" segmented control with `radiogroup` +
`radio` roles and arrow-key selection.
Counter-example: five divs each with `tabindex="0"` and a click handler —
technically clickable, but Tab visits all five and no `aria-checked` exists.
