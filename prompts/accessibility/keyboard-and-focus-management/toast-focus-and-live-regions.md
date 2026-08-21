---
id: keyboard-and-focus-management-toast-focus-and-live-regions
title: Announcing toasts without stealing keyboard focus
category: accessibility
subcategory: keyboard-and-focus-management
tags: [toast, live-region, aria-live, notifications]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A toast or transient notification should be heard, not focused — moving
keyboard focus to it interrupts whatever the user was doing, while a
correctly configured live region announces it without touching focus at
all.

- Render toasts inside a persistent container marked `aria-live="polite"`
  (or `role="status"`) that exists in the DOM before any toast appears, so
  assistive tech is already watching it when content is injected.
- Never call `.focus()` on the toast itself for a routine confirmation
  ("Saved", "Copied to clipboard") — the user is mid-task and focus must
  stay where they left it.
- Reserve `aria-live="assertive"` (or a real focus move) for the rare case
  where the notification is also an error the user must act on immediately
  and losing it would break the task — assertive interrupts announcement
  queues, so overusing it drowns out everything else on the page.
- If a toast contains an actionable control ("Undo"), keep it reachable via
  normal Tab order at its position in the DOM rather than forcing focus to
  it, so the user can choose to act on it or keep working.
- Auto-dismiss timing must not be the only way to lose an actionable toast —
  give it a manual dismiss as well, since a screen reader user may take
  longer to reach it than the timeout allows.

Why: `aria-live` regions are specifically designed to announce dynamic
content without disrupting the accessibility-tree focus position, which
matches how sighted users actually experience a toast — they notice it in
peripheral vision without stopping what they're doing.

Example: `<div aria-live="polite" role="status">Changes saved</div>` updated
in place on save, with the user's cursor never leaving the form field they
were editing.

Counter-example: `toastElement.focus()` fired on every save confirmation —
a screen reader user editing a form field gets yanked to the toast mid-
sentence and loses their place in the field they were typing into.
