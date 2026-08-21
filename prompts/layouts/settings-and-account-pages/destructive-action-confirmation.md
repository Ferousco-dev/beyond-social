---
id: settings-and-account-pages-destructive-action-confirmation
title: Scaling confirmation friction to blast radius
category: layout
subcategory: destructive-actions
tags: [settings, confirmation, destructive-actions, modal]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Every irreversible settings action needs a confirmation surface whose
friction scales with how much it destroys, rather than one generic "Are you
sure?" modal reused for everything from removing an API key to deleting a
workspace.

The recipe:

- Low-blast-radius actions (remove one API key, disconnect one integration):
  a single modal with a primary button labeled with the actual verb —
  "Remove key," never a generic "OK" or "Yes."
- High-blast-radius actions (delete account, delete workspace, transfer
  ownership): require typing the resource's exact name or slug into a text
  field before the confirm button enables at all.
- State the consequence in plain language in the modal body, not just the
  title — "This deletes 214 saved projects and cannot be undone," not a bare
  "This action cannot be undone" that names no actual consequence.
- Reserve the destructive-red fill for the confirm button inside the modal
  itself; the row that triggered it can stay in the neutral danger-zone
  outline style so red doesn't appear twice and lose emphasis.

Why: friction should scale with reversibility cost — a well-established
anti-dark-pattern principle is to make the hard-to-reverse action hard to
trigger by accident, never the easy-to-reverse one. Naming the actual
consequence in the modal converts an abstract warning the user has learned to
click through into a specific fact they have to actually read and weigh.

Example: deleting a workspace requires typing the workspace's slug
("acme-corp") into a field before "Delete workspace" enables, with body text
listing exactly what's lost.
Counter-example: a single reusable "Are you sure?" modal with "Cancel" and
"Confirm" used identically for removing a saved filter and for deleting an
entire account — the same low friction applied to wildly different stakes.
