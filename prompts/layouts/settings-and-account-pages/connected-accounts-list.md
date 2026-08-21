---
id: settings-and-account-pages-connected-accounts-list
title: Listing connected accounts and integrations as scoped rows
category: layout
subcategory: integrations
tags: [settings, integrations, oauth, security]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Connected third-party accounts and integrations should render as rows
carrying logo, connected identity, and permission scope, never as a bare grid
of on/off toggle switches.

The recipe:

- Each row shows: provider logo, the specific connected identity (the actual
  email or handle, not just the word "Connected"), a "View permissions" link
  or inline scope summary, and a "Disconnect" action on the right.
- Show connection health as a row-level state — "Token expired, reconnect" —
  right where the problem is, not as a separate error banner elsewhere on the
  page disconnected from its fix.
- State explicitly what happens to data on disconnect ("Your calendar events
  stay, syncing stops") — never let "Disconnect" silently delete content the
  integration created without saying so first.
- Once the list exceeds roughly six integrations, group rows by category
  (Calendar, Storage, Communication) using the same section pattern as the
  rest of settings, not a separate marketplace-style card grid.

Why: a connected account is an OAuth grant with real permission scope, so the
row's job is to answer "what can this thing do with my account," which a bare
toggle cannot communicate. Specificity here — whose account, what scope, what
survives disconnection — is a security-legibility requirement, not visual
decoration, because users can't audit a grant they can't see the shape of.

Example: a row with the Google logo, "you@company.com," "Can read your
calendar" as scope text, and "Disconnect" on the right; disconnecting shows a
one-line confirmation of what stays and what stops.
Counter-example: a grid of provider logos each with a single toggle switch
and no identity or scope text — a user cannot tell which Google account is
connected, what it can access, or what breaks if they turn it off.
