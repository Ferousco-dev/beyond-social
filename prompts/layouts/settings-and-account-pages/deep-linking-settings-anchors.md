---
id: settings-and-account-pages-deep-linking-settings-anchors
title: Stable deep links for every settings section and field
category: layout
subcategory: navigation-structure
tags: [settings, deep-linking, routing, urls]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Every settings section, and every field a user is likely to be sent to from
elsewhere in the product, needs a stable URL or anchor, because settings are
frequently a link's destination rather than a page a user browses into on
their own.

The recipe:

- Give every section its own route (/settings/billing, /settings/security),
  never a single /settings route that requires client-side clicking to reach
  a subsection.
- Give high-support-volume individual fields an anchor that both scrolls to
  and highlights the field, such as /settings/notifications#marketing-emails,
  used by unsubscribe links and in-app error CTAs ("Your card failed — update
  payment method" linking straight to the field).
- Preserve the deep link across the responsive switch from rail-plus-panel to
  mobile drill-down: a mobile visit to a section URL opens directly into that
  drill-down screen, never the top-level section list first.
- Never let an authentication redirect drop the original destination — after
  login, return the user to the exact settings link they followed, not a
  generic settings home they now have to renavigate from.

Why: settings pages are routinely the target of links generated elsewhere in
the product — an error toast, a billing-failure email, a support macro, an
in-app upsell — so treating routes as an internal implementation detail
quietly breaks every one of those surfaces that assumed a stable URL exists,
usually discovered only when a support ticket reports a dead link.

Example: a billing-failure email's "Update payment method" button links to
/settings/billing#payment-method, which on click scrolls to and briefly
highlights the payment card, on both desktop and mobile.
Counter-example: a settings page built as a single-page app with no
per-section routing, so every "click here to fix it" link in emails and
error states can only point at /settings and leave the user to find the
right tab themselves.
