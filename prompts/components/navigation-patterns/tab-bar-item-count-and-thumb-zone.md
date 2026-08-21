---
id: navigation-patterns-tab-bar-item-count
title: Tab bar item count and thumb-zone placement
category: component
subcategory: navigation
tags: [navigation, tab-bar, mobile, ergonomics]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A bottom tab bar has a hard ceiling on item count set by thumb ergonomics and
icon legibility, not by how many sections the product happens to have.

- Cap at 5 items. iOS HIG and Material both converge here because a 6th icon
  drops label width below reliable legibility on a 375-390px-wide screen.
- Reserve the two bottom corners for the most-reached destinations (typically
  Home and Profile/Account); the thumb's natural resting arc favors the bottom
  center and bottom corners over the top of the screen.
- If a 6th destination is truly needed, do not add a "More" catch-all tab —
  instead demote the least-used destination into a menu reachable from Profile,
  or merge two related destinations into one screen with an internal segmented
  control.
- Keep tab bar height and hit target at minimum 44x44pt (iOS) / 48x48dp
  (Android) including label, not just the icon glyph.
- Never let tab bar item count change between screens of the same app — a
  shifting tab bar breaks the spatial memory that makes tab bars fast in the
  first place.

Why: spatial memory is the entire value proposition of a tab bar. Users stop
reading labels within days and start tapping by position; that only works if
position is stable and the array is short enough to scan in the ~200ms of a
saccade before the thumb moves. A 7-item bar forces reading, which is a sidebar
behavior smuggled into a tab bar's real estate.

Example: "bottom tab bar: Home, Search, Create (center, elevated), Notifications,
Profile — five stable items, no overflow."

Counter-example: an 8-item tab bar with 11px labels wrapping to two lines,
forcing users to squint and mis-tap between Notifications and Messages.
