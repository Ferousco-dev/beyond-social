---
id: settings-and-account-pages-security-section-structure
title: Structuring the security and authentication section
category: layout
subcategory: security
tags: [settings, security, authentication, mfa]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, auth]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Security settings split into three distinct data types — credentials, second
factors, and active sessions — and each needs its own subsection with a
treatment matched to how it's actually used.

The recipe:

- Password: an action row that opens a separate flow ("Change password" →
  dedicated screen), never an inline field sitting next to unrelated
  settings; always require re-entry of the current password before a change
  is accepted.
- MFA: a list of enrolled methods (authenticator app, SMS, security key),
  each individually removable, with "Add another method" — never a single
  on/off toggle, since users can and do enroll more than one method.
- Sessions and devices: a table with device name, approximate location, last
  active time, and a per-row "Revoke," sorted most-recent-first, plus one
  "Log out everywhere else" action.
- Note in help text that any security change — password reset, MFA add or
  remove, session revoke — triggers an email notification as a side effect
  independent of the UI, so the user isn't confused by an email they didn't
  explicitly request.

Why: security actions carry account-takeover risk, and that risk, not visual
convenience, is what should drive the grouping. Users reasoning about a
possible compromise think in terms of mechanism — "how could someone get in,
and how do I lock them out" — so organizing by credential type maps directly
onto the diagnostic questions they're actually asking.

Example: a "Sign-in & security" panel with three clearly labeled blocks —
Password, Two-factor methods, Active sessions — each independently scannable.
Counter-example: a flat list mixing "Change password," "Enable dark mode,"
and "Connected apps" under one generic "Account" heading — security-critical
actions lose visual priority next to cosmetic ones.
