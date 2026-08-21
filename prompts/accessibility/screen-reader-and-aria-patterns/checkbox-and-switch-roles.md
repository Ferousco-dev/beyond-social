---
id: screen-reader-and-aria-patterns-checkbox-and-switch-roles
title: Custom checkboxes and toggle switches
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, checkbox, switch, toggle, form-controls]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, onboarding, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A checkbox and a toggle switch are different roles with different implied
semantics, and a styled `<div>` standing in for either needs the full state
contract, not just visual mimicry.

- Prefer a real `<input type="checkbox">` visually hidden and restyled via its
  sibling/label, so native keyboard and state handling survive; only reach for
  `role="checkbox"` on a div when the design truly cannot use a native input.
- If building from a div: `role="checkbox"`, `tabindex="0"`,
  `aria-checked="true"|"false"|"mixed"`, and a keydown handler for Space that
  toggles state and updates `aria-checked` together, synchronously.
- For a toggle switch specifically, use `role="switch"` instead of `checkbox`
  when the control represents an immediate on/off setting (not a form
  selection to submit later) — screen readers announce switches as "on/off"
  rather than "checked/not checked," matching the mental model.
- `aria-checked="mixed"` is valid only on `checkbox`, for a parent controlling a
  partially-selected set of children (e.g. "select all" with some rows checked).
- Always pair with a visible, programmatically associated label — `aria-label`
  alone on a bare toggle with no visible text fails users who rely on voice
  control ("click dark mode") as much as it fails screen readers.

Why: `aria-checked` is what a screen reader speaks instead of relying on visual
state; if the class toggles but the attribute doesn't, sighted-assistive-tech
users hear the opposite of what they see.

Example: `<button role="switch" aria-checked="false" aria-label="Dark mode">`.
Counter-example: a div with a CSS class `.is-checked` that toggles visually but
carries no `role` or `aria-checked`, silent to any screen reader.
