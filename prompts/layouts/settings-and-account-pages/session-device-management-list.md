---
id: settings-and-account-pages-session-device-management-list
title: Presenting active sessions as a scannable device list
category: layout
subcategory: security
tags: [settings, security, sessions, devices]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Active sessions and devices belong in a sortable, scannable list distinct
from the MFA-methods list, because a user opens it under a different kind of
pressure than routine settings browsing.

The recipe:

- Columns: device or browser with its OS icon, approximate location (city or
  region from IP, never precise geocoding), last-active time as a relative
  timestamp ("2 hours ago"), and a per-row "Revoke."
- Label the current session explicitly ("This device") and disable its own
  revoke control — a user must never be able to accidentally lock themselves
  out from inside this same list.
- Sort by last-active descending by default; an unfamiliar device sorted to
  the top is exactly the signal a user checking for compromise needs to see
  first, not buried under stale entries.
- Offer one bulk action, "Log out all other sessions," placed below the list
  and styled as disruptive-but-safe, not identically to the danger zone —
  logging out isn't data loss, so it shouldn't carry the same visual weight.

Why: this list is a security tool used under stress, when a user suspects
their account may be compromised, not a routine browsing surface. Scanability
and unambiguous self-identification matter more here than visual polish,
because the cost of a slow or confusing read is a user who can't tell
whether the unfamiliar row is a threat or their own tablet.

Example: a table sorted newest-first, top row "This device — Chrome on
macOS, revoke disabled," second row "Unknown — Firefox on Windows, Lagos,
Nigeria, 3 minutes ago" with an active Revoke button.
Counter-example: an alphabetically sorted list with no "This device" label
and no location or recency column — a user checking for a break-in has no
way to tell which row, if any, is the intrusion.
