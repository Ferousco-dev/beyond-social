---
id: settings-and-account-pages-notification-preferences-matrix
title: Notification preferences as a type-by-channel matrix
category: layout
subcategory: notifications
tags: [settings, notifications, preferences, matrix]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Notification settings should render as a matrix — notification type as rows,
delivery channel (email, push, in-app) as columns — instead of a flat list of
independent toggles.

The recipe:

- Group rows by the same product-area categories used elsewhere in settings
  (Activity, Billing, Security, Marketing); don't invent a new taxonomy just
  for this panel.
- Keep security notifications (new sign-in, password changed) always on for
  at least one channel; allow channel choice but never let every channel be
  disabled for this row.
- Default marketing and product-update rows to off for new accounts where
  opt-in consent rules apply; default transactional rows (receipts, security
  alerts) to on, and keep them exempt from any bulk marketing unsubscribe.
- Provide one "Turn off all non-essential notifications" action above the
  matrix for the fast path, in addition to the per-cell control underneath.

Why: a flat toggle list forces the user to mentally reconstruct a grid —
"did I mean to turn off push for this, or every channel for this?" — that the
underlying delivery system already has natively, since notifications are
built as category-by-channel dispatch rules. Rendering the actual matrix
externalizes that structure instead of hiding it behind a list of similarly
styled switches that don't reveal their relationships.

Example: a table with rows "New comment," "Weekly digest," "Billing receipt,"
"Security alert" and columns Email/Push/In-app, checkboxes at each
intersection, Security alert's Email column locked to checked.
Counter-example: forty individual toggles labeled things like "Email me about
comments" and "Push me about comments" as separate flat rows — same
information, but the channel relationship has to be reconstructed by reading
every label instead of scanning a column.
