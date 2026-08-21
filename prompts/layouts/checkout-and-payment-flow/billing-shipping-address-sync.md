---
id: checkout-and-payment-flow-billing-shipping-sync
title: Default billing address to "same as shipping," checked
category: layout
subcategory: form-design
tags: [billing-address, form-design, checkout, avs]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

Default the "billing address same as shipping" checkbox to checked, and only
reveal a separate billing form when the buyer actively unchecks it.

The recipe:

- Pre-check the "same as shipping" box by default, since the large majority
  of consumer orders bill and ship to the same address.
- Don't render the separate billing form in a grayed-out or hidden-but-present
  state — remove it from the DOM entirely until the box is unchecked, so
  there's nothing extra for the eye to parse and dismiss.
- When unchecked, don't wipe fields the buyer will likely reuse, like
  country — carry over what's still probably true and let them override only
  what actually differs.
- If using Address Verification Service (AVS) matching against the card
  issuer, explain a billing-mismatch decline distinctly from a plain
  insufficient-funds decline; they require different fixes.

Why: for the overwhelming majority of retail purchases, ship-to and bill-to
addresses are identical, so defaulting to a duplicate form doubles the
visible fields for zero benefit to the common case. The buyer who genuinely
needs a different billing address, a gift order, a business card, is well
served by one extra click to reveal it; defaulting to two full address forms
instead punishes everyone else with double the typing to solve a problem
most of them don't have.

Example: a single checked checkbox, "Billing address same as shipping," with
the billing form entirely absent from the page until unchecked.
Counter-example: two full address forms rendered side by side by default,
"Shipping" and "Billing," identical in every field, for every buyer
regardless of whether the addresses actually differ.
