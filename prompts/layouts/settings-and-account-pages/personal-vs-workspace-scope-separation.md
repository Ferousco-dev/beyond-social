---
id: settings-and-account-pages-personal-vs-workspace-scope-separation
title: Separating personal account settings from workspace settings
category: layout
subcategory: navigation-structure
tags: [settings, multi-tenant, workspace, information-architecture]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Settings that follow the individual (personal account) and settings shared by
a team (workspace or organization) need two distinct entry points, never one
merged rail with mixed scope.

The recipe:

- Give each scope its own entry point: "Your account" from the user avatar
  menu, "Workspace settings" from the workspace switcher or org name — not a
  single settings link that dumps both into one rail.
- Prefix every screen with a persistent scope indicator: avatar plus personal
  name for account settings, org logo plus org name for workspace settings,
  so the user always knows which blast radius they're editing.
- Role-gate workspace-only items visibly rather than hiding them: show the row
  with an "Admin only" label and disabled state for non-admins instead of
  removing it, so members know the capability exists and who to ask.
- Never place a personal action (sign out of all devices) on the same screen
  as a workspace action (transfer ownership, delete workspace) — a shared
  page implies a shared consequence, and these do not share one.

Why: mixing scopes causes the specific, hard-to-detect error of a user
changing the wrong thing while believing they changed the other — muting
personal notifications when they meant to leave a channel, or vice versa. The
fix is not clearer copy on a shared page; it's two separate surfaces so scope
is established before the user reads a single field label.

Example: clicking the org name opens /workspace/settings with the org logo in
the header; clicking the avatar opens /account/settings with the user's own
photo in the header — visually impossible to confuse.
Counter-example: one "Settings" page with a single rail listing "Profile,"
"Notifications," "Members," and "Billing" together — a member looking for
their own notification preferences lands one click from workspace billing
controls they were never meant to see, let alone touch.
