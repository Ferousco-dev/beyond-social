---
id: navigation-patterns-notification-badges
title: Notification badge conventions on navigation items
category: component
subcategory: navigation
tags: [navigation, badges, notifications, tab-bar]
applicability:
  platforms: [web, mobile]
  productTypes: [mobile-app, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

A badge on a nav item is a promise that something specific and actionable
changed behind it; badges lose meaning fast if applied to anything merely
"new" or unread in a low-stakes way, training users to ignore them.

- Reserve red dot/count badges for items requiring a decision or response
  (unread DMs, pending approvals, failed jobs) — not for passive activity like
  "someone viewed your profile."
- Use a plain dot for "there is something new" and a numeric count only when
  the count itself is actionable information (12 unread messages vs. an
  arbitrary "content changed" ping); counts that include marketing or
  low-priority items inflate and get ignored.
- Clear the badge the moment the destination is opened, not after some idle
  delay — a badge that persists after the item was viewed teaches users the
  badge lies.
- Cap displayed counts (e.g. "99+") rather than rendering a five-digit number
  that breaks the badge's fixed size and shifts adjacent nav items.
- Position consistently: top-right of the icon in a tab bar, trailing edge of
  the label in a sidebar row — never let position vary between items in the
  same nav.

Why: badges work as an attention economy — if every tab always has a badge,
none of them communicate priority, and users learn to swipe past all of them,
which is the opposite of the mechanism's purpose. Sparse, honest badges keep
their signal value.

Example: "Inbox tab shows a red numeric badge only for messages needing a
reply; Activity tab shows a plain dot for new likes/follows, no count."

Counter-example: every one of five tabs permanently displaying a red badge
because each surfaces "any unseen content," so the badges become wallpaper the
user stops registering within a week.
