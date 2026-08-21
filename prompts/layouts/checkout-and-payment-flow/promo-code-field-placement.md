---
id: checkout-and-payment-flow-promo-code-placement
title: Collapse the promo code field, don't feature it
category: layout
subcategory: form-design
tags: [promo-code, discounts, conversion, form-design]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Keep the promo code field small, collapsed, and low in the visual hierarchy —
a prominent one invites the buyer to leave and go hunting for a coupon before
they'll finish paying.

The recipe:

- Render the discount code entry as a collapsed text link, "Have a promo
  code?", rather than an always-visible open input box.
- Never place it above the order summary or beside the primary "Pay" button
  where it competes for attention with the action you actually want taken.
- If a submitted code is invalid, show the error inline without collapsing
  the field back shut or forcing a page reload that loses other progress.
- Do not run marketing pop-ups suggesting "check for a better discount" —
  that behavior manufactures the exact exit impulse this pattern avoids.

Why: a visible, empty promo field implies a discount must exist somewhere,
which is often enough to send a price-sensitive buyer to a new browser tab
to search a coupon aggregator site — and a meaningful share of buyers who
leave to search never return to finish the order they were already
committed to. Collapsing the field low in the hierarchy keeps it available
for buyers who already hold a code without broadcasting an invitation to
comparison-shop mid-purchase.

Example: a plain text link, "Have a promo code?", sitting below the order
total, expanding into a single-line input only when clicked.
Counter-example: an open "Enter promo code" input box positioned directly
above the "Pay Now" button on every visit, even for buyers with no code to
enter, silently suggesting one should be found first.
