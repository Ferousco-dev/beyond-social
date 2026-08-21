---
id: screen-reader-and-aria-patterns-modal-dialog-pattern
title: Modal dialogs, aria-modal, and focus trapping
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, dialog, modal, focus-trap, screen-reader]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A modal has to do four things in concert, and getting only three of them right
still leaves it broken for screen reader or keyboard-only users.

- Prefer the native `<dialog>` element with `.showModal()` when the design
  allows it; it handles the top-layer stacking, `::backdrop`, and Escape-to-close
  natively. Otherwise use `role="dialog"` (or `role="alertdialog"` for a
  confirm/destructive prompt) on the container.
- `aria-modal="true"` tells assistive tech the rest of the page is inert; pair it
  with actually setting `inert` (or `aria-hidden="true"`) on sibling content, or
  a screen reader user can still virtually-cursor-navigate into the page behind
  the dialog even though sighted users can't reach it.
- `aria-labelledby` pointing at the dialog's visible heading (or `aria-label` if
  there's no heading) so it announces a name, not just "dialog."
- On open, move focus to the dialog itself or its first interactive element; on
  close, return focus to the element that triggered it — never let focus fall
  back to `<body>`, which strands keyboard and screen reader users at the top of
  the page.
- Trap Tab/Shift+Tab within the dialog's focusable elements while open, and
  close on Escape unless the dialog represents an unsaved, destructive choice
  the user must explicitly resolve.

Why: `aria-modal` only changes what's announced, not what's reachable; without
`inert`/`aria-hidden` and an actual focus trap, a screen reader user can tab or
swipe straight through the dialog into background content that sighted users
cannot see or interact with, breaking the illusion of modality entirely.

Example: `<div role="dialog" aria-modal="true" aria-labelledby="dlg-title">`
with focus moved to the close button on open, returned to the trigger on close.
Counter-example: a centered div with a backdrop and `role="dialog"` but no
`aria-modal`, no focus move, and background content still tabbable.
