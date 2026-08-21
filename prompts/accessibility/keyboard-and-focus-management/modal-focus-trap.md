---
id: keyboard-and-focus-management-modal-focus-trap
title: Trapping focus inside a modal dialog
category: accessibility
subcategory: keyboard-and-focus-management
tags: [focus-trap, modal, dialog, keyboard]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

When a modal dialog is open, Tab and Shift+Tab must cycle only through the
elements inside that dialog, never back out to the page behind it.

- Compute the dialog's focusable elements on open (`button`, links with
  `href`, inputs, `[tabindex]:not([tabindex="-1"])`) and re-scan if content
  changes, since a static list goes stale after async content loads.
- Wrap the ends: Tab from the last focusable element moves to the first,
  Shift+Tab from the first moves to the last. Do not let focus escape to
  the browser chrome or to page content under the overlay.
- Set `aria-hidden="true"` (or `inert`) on sibling page content so a screen
  reader's virtual cursor cannot wander into it either — a visual trap
  without an accessibility-tree trap is only half fixed.
- Never trap focus in something that is not modal (a toast, a non-blocking
  panel, an inline expanded section). A trap on a dismissible-but-not-blocking
  element is itself a keyboard trap and a WCAG failure.

Why: sighted mouse users get an implicit trap for free — the backdrop makes
everything else unreachable at a glance. Keyboard users get no such cue; without
an explicit trap, Tab silently walks into hidden or obscured page elements,
and the user loses track of where focus went entirely.

Example: dialog contains name input, cancel button, save button; Tab from
"Save" wraps to the name input, Shift+Tab from the name input wraps to "Save".

Counter-example: implementing the trap only by listening for Tab in JS
without also hiding background content from assistive tech — a screen reader
user can still navigate by heading or landmark into the "trapped" page behind
the dialog, defeating the purpose entirely.
