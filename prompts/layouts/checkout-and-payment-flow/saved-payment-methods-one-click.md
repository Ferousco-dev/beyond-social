---
id: checkout-and-payment-flow-saved-payment-one-click
title: Returning buyers get a pre-selected saved card, not a blank form
category: layout
subcategory: payment-methods
tags: [returning-customers, saved-cards, conversion, checkout]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

For returning buyers, surface saved payment methods as pre-selected one-tap
options, not as one more form to fill out from scratch.

The recipe:

- Show saved cards as a short list of tappable options — last four digits,
  network logo, expiry date — with the most recently used one pre-selected
  by default.
- Let the buyer change the shipping address for a saved card independently,
  without needing to re-enter any card data to do so.
- Provide a clearly separate "Use a different card" link rather than
  defaulting a returning buyer back to an empty entry form.
- Mask stored card data consistently, "•••• 4242," and never re-display a
  full card number after initial entry, even to the account owner viewing
  their own saved methods.

Why: a repeat buyer already cleared both the trust hurdle and the effort
hurdle the first time they checked out. Making them retype a card they've
used before treats a warm, already-converting customer identically to a
first-time visitor, which wastes the highest-leverage segment to speed up —
their intent to buy is already proven, so the only thing left standing
between them and the order is unnecessary re-entry.

Example: "Visa •••• 4242, exp 08/27" shown pre-selected with a single
"Pay $84.00" button beneath it and no other visible fields.
Counter-example: a returning, logged-in buyer still shown a blank card
number entry form identical to what a first-time guest would see.
