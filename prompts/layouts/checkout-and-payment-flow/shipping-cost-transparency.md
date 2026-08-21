---
id: checkout-and-payment-flow-shipping-cost-transparency
title: Show real shipping and tax before the final step, never after
category: layout
subcategory: pricing-transparency
tags: [pricing, shipping, tax, conversion]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Show the real shipping cost and total, including tax, as early as the
information is available, never for the first time on the last screen before
payment.

The recipe:

- Calculate and display shipping cost as soon as a valid address is entered,
  on the same step, not deferred to a separate "review" screen after payment
  details have already been collected.
- Show estimated tax alongside the subtotal on the same view, using the
  address data already provided rather than waiting for full validation.
- If exact tax can't be finalized until the address is fully verified, show
  a clearly labeled estimate range instead of omitting the line item.
- Never introduce a new charge — a handling fee, a service fee — for the
  first time on the final confirm screen; reveal every cost component as
  soon as it's knowable.

Why: buyers form a mental total early in the flow and treat any late
addition to it as a bait-and-switch, even when the added cost is standard
and unavoidable, like sales tax. Surprise costs revealed at the last step
are consistently the top cited reason for cart abandonment in checkout
usability research, because the objection isn't the amount, it's the
timing — a total that's allowed to jump right before the commit action
reads as deceptive regardless of intent.

Example: subtotal $60.00 shown with shipping $6.50 immediately after address
entry, and tax $4.80 added before the "Continue to payment" button.
Counter-example: the checkout shows only "$60.00" through every step, then
reveals "$71.30 total" for the first time directly beside the Pay button.
