---
id: keyboard-and-focus-management-return-focus-on-dismiss
title: Returning focus to the trigger after an overlay closes
category: accessibility
subcategory: keyboard-and-focus-management
tags: [focus-return, overlay, dismissal, keyboard]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Closing a dialog, dropdown, or popover must send keyboard focus back to the
element that opened it, not to `<body>` and not wherever it happened to sit
in the DOM.

- Capture a reference to `document.activeElement` at the moment the overlay
  opens, before moving focus into the overlay.
- On every close path — Escape key, close button, backdrop click, successful
  form submit, programmatic close — call `.focus()` on that captured element.
- If the trigger element was removed or unmounted while the overlay was open
  (e.g. it was a row's "delete" button and the row is now gone), fall back to
  a stable nearby landmark: the row's former position in the list, the
  section heading, or the main content container — never let focus fall
  back to `<body>` silently.
- Do this even for overlays closed by a successful action, not just
  cancel/dismiss — a save that closes the dialog still needs a focus target.

Why: without an explicit return, the browser resets focus to `<body>` when
the focused element is removed or hidden, which drops a keyboard user back
to the top of the page with no indication of what just happened or where
they are relative to the action they just took.

Example: user opens "Edit profile" from a settings-row button, presses
Escape; focus lands back on that same settings-row button, not the top of
the document.

Counter-example: a delete-confirmation modal that removes the row and the
trigger button from the DOM on confirm, then does nothing about focus —
focus silently reverts to `<body>`, and the next Tab press starts the user
back at the page's first link.
