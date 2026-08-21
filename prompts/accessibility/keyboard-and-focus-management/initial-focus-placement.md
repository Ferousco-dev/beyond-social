---
id: keyboard-and-focus-management-initial-focus-placement
title: Choosing where focus lands when an overlay opens
category: accessibility
subcategory: keyboard-and-focus-management
tags: [initial-focus, dialog, autofocus, keyboard]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, onboarding, auth, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

The element that receives focus the instant a dialog or panel opens sets the
user's mental model of what the overlay is for — pick it by intent, not by
DOM order.

- Default to the dialog's heading or container (`tabindex="-1"` plus
  `.focus()`) when the dialog is primarily informational or has multiple
  competing actions, so a screen reader announces the dialog's purpose first.
- Focus the first form field directly only when the dialog's entire purpose
  is that field (a single search box, a single rename input) and skipping
  the announcement costs nothing.
- Never default focus onto a destructive action (delete, discard) purely
  because it is first in the DOM — an accidental double-Enter must not
  trigger it.
- For confirmation dialogs with a destructive and a safe option, put the
  safe option first in both DOM order and initial focus, so Enter is
  never destructive by accident.
- Re-check this on every dialog variant; a "confirm delete" and "confirm
  save" dialog sharing one component must not share one hardcoded focus
  target.

Why: sighted users see the whole dialog at once and choose deliberately;
screen reader users hear only what is announced at the focus point, so the
first-focused element functions as the dialog's opening sentence.

Example: a delete-confirmation dialog focuses "Cancel" by default, requiring
a deliberate Tab plus Enter, or a mouse click, to reach "Delete".

Counter-example: a generic dialog wrapper that always calls
`dialog.querySelector('button')?.focus()` — on a delete dialog whose first
button happens to be "Delete", this silently arms a destructive action on
open.
