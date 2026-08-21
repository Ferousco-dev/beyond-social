---
id: cards-and-lists-density-presets
title: Density presets for lists
category: component
subcategory: cards-and-lists
tags: [density, lists, spacing, tokens]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Define exactly three density presets — comfortable, compact, dense — as fixed token sets, and never blend them within a single list.

- Comfortable: 16px vertical padding, ~56-64px row height, room for a secondary text line. Default for first-time or browsing contexts.
- Compact: 12px padding, ~44-48px row height, single-line secondary text. Default for returning users doing routine review.
- Dense: 8px padding, ~32-36px row height, single-line everything, no wrapped text. Reserved for power users doing bulk operations on large tables.
- Expose density as a user-controlled toggle rather than baking one choice in, and persist the choice (local storage or account setting) so it doesn't reset every session.
- On touch devices, the visual row height can shrink to dense, but the tappable hit area must not — pad the hit box out to at least 44px even when the drawn row is 32px, since Fitts's law penalties for undersized touch targets don't care how the row looks.

Why: density is a tradeoff between information-per-screen and per-row legibility. Comfortable density reduces cognitive load for someone still learning what each field means; dense density trades that legibility for throughput once the user already knows the layout by heart. Fixing three presets (rather than letting density drift ad hoc per screen) keeps the whole product's rhythm predictable, so muscle memory built on one list transfers to the next.

Example: "compact density: 44px row, 24px avatar, single-line title, right-aligned status pill."
Counter-example: shipping 28px dense rows as the only option on a touchscreen mobile app — users mis-tap adjacent rows constantly and there's no comfortable mode to fall back to.
