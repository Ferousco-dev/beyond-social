---
id: screen-reader-and-aria-patterns-alert-vs-status-toast-pattern
title: role=alert vs role=status for toast notifications
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, alert, status, toast, notifications]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Toast notifications need one of two built-in live-region roles, chosen by how
urgent the message actually is, not by whichever one happens to look right in a
component library's default export.

- `role="alert"` is an implicit `aria-live="assertive"` region: use it for
  errors and failures the user did not cause by direct successful action —
  "Payment failed," "Connection lost." It interrupts immediately.
- `role="status"` is an implicit `aria-live="polite"` region: use it for
  confirmations of something that just succeeded — "Changes saved," "Link
  copied." It waits its turn.
- Both roles announce automatically as soon as they're added to the DOM with
  content already inside them; unlike a manual `aria-live` div, you don't need
  the "mount empty, then fill" sequencing, because the role itself signals
  intent to assistive tech the moment the element appears.
- Auto-dismissing toasts must stay visible (and their DOM node present) long
  enough to be read at typical screen reader speech rates — err toward 5-7
  seconds minimum for a short message, longer for anything with more than a
  handful of words, and never auto-dismiss on a timer shorter than what a
  sighted user would need to read it either.
- Give the toast container `aria-atomic="true"` so a single character change
  (e.g. an updated error count) re-reads the whole message rather than a
  disconnected fragment.

Why: `alert` and `status` exist precisely so common notification urgency levels
don't require hand-wired `aria-live`; picking the wrong one either buries a
real failure in a polite queue behind other speech, or interrupts a user
mid-task for routine confirmations.

Example: `<div role="status">Draft saved</div>` for a successful autosave.
Counter-example: every toast in the app using `role="alert"` regardless of
severity, so a routine "Copied to clipboard" cuts off whatever the screen
reader was mid-sentence announcing.
