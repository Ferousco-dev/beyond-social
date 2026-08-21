---
id: modals-and-overlays-toast-vs-modal-boundary
title: Toast versus modal, matching interruption to stakes
category: component
subcategory: modals-and-overlays
tags: [toast, notification, modal, interruption-level]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A toast is for information the user doesn't need to act on right now; a modal is for a decision that must be made before anything else can happen. Conflating the two either annoys users with blocking trivia or lets consequential decisions slip past as a five-second popup.

- Use a toast for confirmations of actions the user already initiated and can easily undo, such as "Saved," "Link copied," or "Archived — Undo."
- Use a modal when the system needs an answer before it can proceed, such as permission grants, blocking errors, or required disambiguation.
- Never put a form in a toast, and never ask it to carry more than a single "Undo" action; anything more belongs in a modal.
- Auto-dismiss toasts, typically after 4-6 seconds, but pause the timer on hover or focus so keyboard and mouse users can still read and act.
- Never use a toast for a destructive confirmation on something high-stakes; bulk deletes and account-level changes need the modal's forced pause, not a passively dismissible strip.

Why: The two patterns sit at opposite ends of the interruption spectrum on purpose. A toast respects that the user has already moved on, while a modal exists precisely to stop them from moving on. Using a toast for something that needed real deliberation removes the user's chance to catch a mistake before it becomes final.

Example: "Toast: 'Draft saved,' no action required, auto-dismisses in 4s."
Counter-example: "Toast: 'Are you sure you want to delete this workspace?' with Confirm and Cancel buttons." A five-second auto-dismissing strip is the wrong container for an irreversible, high-stakes decision; it can vanish before the user even reads it.
