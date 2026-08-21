---
id: buttons-and-ctas-destructive-confirmation
title: Destructive button styling and confirmation
category: component
subcategory: buttons-and-ctas
tags: [buttons, destructive, confirmation, safety]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Irreversible actions need a button that looks different from every other
button in the interface and a confirmation step proportional to how bad it
would be to click it by accident.

The recipe:

- Use a distinct destructive color (typically a red reserved exclusively for
  this purpose) so it never gets confused with an ordinary secondary action —
  don't reuse that red for warnings, badges, or anything non-destructive.
- Reversible-but-costly actions (archive, remove from list) can be a plain
  secondary button with a single confirmation dialog or an undo toast after
  the fact.
- Truly irreversible actions (permanent delete, account closure) need
  friction proportional to the stakes: a confirmation dialog whose own
  confirm button repeats the specific consequence ("Delete 340 records"), not
  a generic "Are you sure?" with "Yes/No."
- For the highest-stakes deletions, require the user to type the resource's
  name or "DELETE" before the confirm button in the dialog becomes enabled —
  this forces a moment of deliberate attention rather than reflexive clicking.
- Never place a destructive button directly adjacent to a primary button with
  matching size and shape; separate them with spacing or place destructive
  actions in a different visual zone (e.g. a kebab menu) so a misclick is
  physically less likely.

Why: destructive actions fail catastrophically and asymmetrically — a user
who accidentally saves twice loses nothing, but a user who accidentally
deletes a project loses data. Styling and friction should scale with the
actual cost of a mistake, not with how often the action is used.

Example: a "Delete project" button that opens a dialog requiring the project
name typed exactly before "Permanently delete" becomes clickable.

Counter-example: "Delete" styled identically to "Save," sitting right next to
it in a toolbar, one click apart with no confirmation.
