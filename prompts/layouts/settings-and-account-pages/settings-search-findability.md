---
id: settings-and-account-pages-settings-search-findability
title: Adding search to a growing settings surface
category: layout
subcategory: navigation-structure
tags: [settings, search, findability, information-architecture]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Once a settings surface passes roughly twenty individual fields, add a search
box at the top of the rail so users can text-search instead of relying on
recall of the IA to find a setting.

The recipe:

- Match search against field labels plus a maintained synonym list — a query
  for "2FA" needs to surface "Two-factor authentication," which literal
  substring matching on the visible label will never find.
- Jump results directly to the field itself, scrolling it into view and
  applying a brief highlight flash (roughly 1-2 seconds), not just to the
  containing section — landing on the right section but wrong field re-creates
  the hunt search was meant to remove.
- Pin the search box above the rail, not inside the content panel, so it's
  reachable no matter which section is currently open; bind it to a keyboard
  shortcut (cmd/ctrl+K) for power users.
- Log zero-result queries. A recurring zero-result query is a signal that the
  setting doesn't exist yet or is named in a way users don't guess, not a
  sign the search feature itself is broken.

Why: recall-based navigation gets slower than search the moment the IA grows
past a handful of categories a user can hold in memory — the two-part
question "which section, then which field" doubles the chance of a wrong
guess with every field added. Support-ticket volume for "where do I turn off
X" is a direct, measurable symptom that a settings surface has crossed this
threshold and needs search.

Example: "Search settings" input pinned above the rail; typing "password"
scrolls Security open and highlights the "Change password" row.
Counter-example: a search box that only filters the fields on the currently
open panel, returning nothing for a term that lives in a different section —
this teaches users the setting doesn't exist, which is worse than no search
box at all.
