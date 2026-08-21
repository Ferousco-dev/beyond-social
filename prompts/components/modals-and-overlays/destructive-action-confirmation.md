---
id: modals-and-overlays-destructive-action-confirmation
title: Confirmation modals for destructive actions
category: component
subcategory: modals-and-overlays
tags: [modal, confirmation, destructive-action, trust]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

A confirmation modal for a destructive action only earns trust if it makes the specific consequence concrete, not if it just repeats the verb the user already clicked.

- Name the exact object being destroyed by its real title, not a generic "this item."
- State what happens downstream, for example "3 linked invoices will also be removed," so the user isn't discovering scope after the fact.
- Label the destructive button with the verb, such as "Delete project," never a bare "Confirm" or "OK" that forces the user to recall what they're agreeing to.
- Make the destructive button visually distinct from the safe default in color and position, and never give the safe default equal emphasis so a habitual "next button" click doesn't do damage.
- For catastrophic or irreversible actions, such as deleting an account, require typing the resource's name before the button unlocks; friction here is deliberate.

Why: Confirmation modals fail when they're rubber-stamp UI: identical wording every time trains users to click through without reading, which defeats the entire purpose of the interruption. Specificity forces at least one real read of the consequence, and graduated friction like typed confirmation matches the cost of confirming to the cost of the mistake.

Example: "Delete \"Q3 Launch Campaign\"? This removes 12 scheduled posts and cannot be undone. [Delete campaign]"
Counter-example: "Are you sure? [Cancel] [OK]" — generic wording that names neither the object nor the consequence teaches users to click OK reflexively, which is the opposite of what the confirmation was for.
