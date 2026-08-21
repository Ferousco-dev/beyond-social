---
id: buttons-and-ctas-icon-only-accessibility
title: Icon-only buttons and accessible labeling
category: component
subcategory: buttons-and-ctas
tags: [buttons, icons, accessibility, aria]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

An icon-only button is a bet that the icon is unambiguous without text — that
bet is only safe for a small set of near-universal icons, and even then it
needs a programmatic label for anyone not looking at the screen.

The recipe:

- Reserve icon-only buttons for icons with near-universal recognition in your
  product's context: close (X), search (magnifying glass), settings (gear),
  overflow menu (kebab/ellipsis). Anything less standard needs a visible
  label or a tooltip on top of the icon.
- Every icon-only button must have an accessible name via `aria-label` or
  equivalent (visually-hidden text), even when a tooltip exists — tooltips
  aren't reliably exposed to screen readers on hover-only implementations.
- Tooltips on icon buttons should appear on both hover and keyboard focus,
  with a short delay (300-500ms) so they don't flicker during normal cursor
  travel across a toolbar.
- Keep icon meaning consistent across the entire product — the same icon
  should never mean "delete" in one screen and "archive" in another.
- In a toolbar mixing icon-only and labeled buttons, keep icon sizing and
  optical weight consistent so the icon-only ones don't read as visually
  louder or quieter than their labeled neighbors.

Why: an icon alone carries meaning only if the viewer already has the
convention memorized. Screen reader users, first-time users, and users in a
locale where an icon's metaphor doesn't translate all need the same
information a label would give a sighted, familiar user — the aria-label is
what makes the bet safe even when it doesn't pay off visually.

Example: a trash-can icon button with `aria-label="Delete comment"` and a
tooltip reading "Delete" on hover/focus.

Counter-example: a custom icon (say, a stylized wand for "auto-generate")
used with no label, no tooltip, and no aria-label — meaningless to new users
and invisible to screen readers.
