---
id: microcopy-and-error-messages-destructive-action-confirmation
title: Destructive confirmations name the object and the consequence
category: copywriting
subcategory: microcopy-and-error-messages
tags: [confirmation, destructive-actions, ux-writing, dialogs]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A generic "Are you sure?" adds a click without adding information, and users quickly learn to click through it reflexively; the dialog only does its job when it names the specific object and the specific consequence of losing it.

- Name the object by its actual title, not "this item" — "Delete 'Summer Launch — Draft 3'?"
- State plainly what is unrecoverable versus what can still be restored, rather than implying blanket permanence.
- Put the destructive verb itself on the confirm button (Delete, Discard, Remove), never "OK" or "Yes."
- If the action is reversible within a limited window (a trash bin, a 30-day retention), say so instead of overstating the risk.
- For actions with cascading effects (deleting a project removes its shots), list what else goes with it.

Why: "Are you sure?" is functionally a speed bump, not information, so repeated exposure trains users to dismiss it without reading — which is exactly the failure mode the dialog exists to prevent. Naming the specific object and its specific, real consequence is what re-engages attention at the one moment it actually matters.

Example: "Delete 'Summer Launch — Draft 3'? This removes the video and its 12 generated shots. This can't be undone." [Delete] [Cancel]

Counter-example: "Are you sure you want to delete this?" [Yes] [No] is generic enough that after the first few encounters, users stop reading it and click through on reflex, which defeats the dialog's purpose.
