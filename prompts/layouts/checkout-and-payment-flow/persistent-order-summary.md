---
id: checkout-and-payment-flow-persistent-order-summary
title: Keep the order summary visible across every checkout step
category: layout
subcategory: flow-structure
tags: [order-summary, checkout, conversion, layout]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Keep price and cart contents visible through the entire checkout flow, not
only on the cart page the buyer already left behind.

The recipe:

- Use a sticky sidebar on desktop or a collapsible summary bar on mobile
  showing item thumbnails, quantities, and running total on every step.
- Update the total live when shipping method or promo code changes, not only
  after a full page reload.
- Keep the summary collapsed by default on mobile to save vertical space, but
  always show the current total in the collapsed header, never hide it.
- Never let the buyer lose sight of what they're buying and for how much
  between steps — that gap is where tab-switching to check a competitor's
  price or re-verifying the cart contents happens.

Why: a buyer who loses the anchor of "why am I here and what am I getting"
partway through a multi-step flow is the one who opens a new tab to compare
prices or second-guess the order, and a meaningful share of those tabs never
come back. A persistent, live-updating total keeps the value proposition of
the purchase in constant view exactly when the buyer is being asked to
commit money, which is the worst moment to make them go looking for it.

Example: a sticky right-rail card showing the product thumbnail and "$84.00
total," updating instantly when the buyer switches shipping tiers.
Counter-example: an order summary shown only on the initial cart page, with
steps two and three presenting bare forms and no visible price — the buyer
has to hit back just to remember what they're paying.
