---
id: checkout-and-payment-flow-confirmation-screen
title: The confirmation screen must answer "did it work" at a glance
category: layout
subcategory: flow-structure
tags: [confirmation, receipt, checkout, trust]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

The confirmation screen is still part of checkout, not an afterthought — it
has to answer "did it work" and "what happens next" in the first glance, with
no scrolling required.

The recipe:

- Lead with an unambiguous state signal — a checkmark icon and "Order
  confirmed" — above the fold, before any other content.
- Show the order number, the amount actually charged, and the last four
  digits of the card used, the three facts a buyer typically screenshots
  for their own records.
- State the next concrete milestone with a real date range, "Arrives Aug
  26–28," never a vague "we'll be in touch" placeholder.
- Offer the account-creation or save-details prompt here, after value has
  been delivered, if it was deliberately skipped earlier in the flow.

Why: the confirmation screen is the buyer's only proof that a real
transaction happened exactly once. Ambiguity here — a bare "Thank you" with
no order number or amount — generates support tickets and double-charge
anxiety even when the underlying charge processed correctly a single time,
because the buyer has no artifact to check their bank statement against.

Example: a green checkmark with "Order #48213 confirmed — $84.00 charged to
Visa •••• 4242. Arrives Aug 26–28."
Counter-example: a bare "Thanks for your order!" with no order number,
charged amount, or delivery estimate — nothing for the buyer to reference if
anything goes wrong later.
