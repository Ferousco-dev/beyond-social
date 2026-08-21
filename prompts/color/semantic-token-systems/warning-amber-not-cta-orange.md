---
id: semantic-token-systems-warning-amber-not-cta-orange
title: Keep warning amber out of the CTA and pricing-badge hue range
category: color-system
subcategory: hue-mapping
tags: [warning, amber, hue-collision, semantic-color]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Warning amber (roughly hue 35-45) is one of the most commonly collided
semantic colors because marketing teams independently reach for the same
orange for "limited time," "best value," and "popular" badges.

- Reserve the warning hue band exclusively for genuine caution states:
  approaching a limit, an unsaved change, a soft validation notice.
- Never use it for promotional badges, discount tags, or "recommended plan"
  highlights, even though orange is an intuitively attention-grabbing choice
  for marketing.
- If a pricing or promo badge needs an attention color, pull it toward true
  orange-red (hue ~20) or brand accent tinted gold, clearly outside the
  warning band, and confirm the two are distinguishable side by side at badge
  size.
- Audit onboarding, billing, and marketing surfaces together; warning
  collisions usually happen because those three are designed by different
  people at different times.

Why: a warning token exists to interrupt a user mid-task with "check this
before continuing." If the same color also means "act now, discount ending,"
users habituate to amber as a sales prompt and start dismissing it
reflexively, which is exactly the behavior a real warning cannot afford. The
fix is organizational as much as visual: whoever owns the token map has to be
the single approver for any new orange-family color anywhere in the product.

Example: warning at `#F59E0B` reserved for "your trial expires in 2 days,"
while a pricing page's "Most Popular" badge uses the brand accent tint
instead of orange.
Counter-example: a "Save 20% today" badge in the same `#F59E0B` as the
storage-quota warning banner, so users start ignoring both.
