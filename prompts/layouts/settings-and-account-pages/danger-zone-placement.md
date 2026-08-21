---
id: settings-and-account-pages-danger-zone-placement
title: Danger zone placement and visual treatment
category: layout
subcategory: destructive-actions
tags: [settings, danger-zone, destructive-actions, account-deletion]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Irreversible account actions need a low-traffic, visually separated zone so
they are never mistaken for a routine toggle a user might touch while
scanning.

The recipe:

- Place the danger zone at the very bottom of the Account section, after
  every reversible setting — never on the same visual plane, and never above
  the fold on first load.
- Border it with a 1px red-tinted outline card, not a filled red background —
  a full color block reads as an error state that already happened, which is
  the wrong signal before the user has done anything.
- Require typing the resource's exact name or a confirmation string for
  account- or workspace-level deletion; a single "Are you sure?" modal is one
  reflexive click away from an unrecoverable accident.
- Never reuse the app's primary action color inside the danger zone. Reserve
  red exclusively for destructive actions everywhere in the product, so it
  keeps meaning "this cannot be undone" instead of just "important button."

Why: placement and color are the two cheapest signals a settings page has for
communicating risk before a user reads a single word of copy. Burying the
danger zone below routine controls and holding red in reserve means a user's
eye is never drawn toward destruction while looking for something ordinary,
and the friction of typed confirmation is proportional to how hard the action
is to reverse, not just how the design happened to lay it out.

Example: a bordered card titled "Delete account," last item on the page,
requiring the user to type their account email before "Delete permanently"
enables.
Counter-example: a red "Delete account" button placed directly under the
avatar upload field at the top of Account settings — visually loud, easy to
mis-click while trying to change a profile picture, and unrecoverable.
