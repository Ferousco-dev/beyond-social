---
id: checkout-and-payment-flow-step-count-linear
title: Choosing the right step count for checkout
category: layout
subcategory: flow-structure
tags: [checkout, steps, conversion, form-design]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Step count is a perception problem before it is a math problem: the number of
screens the buyer feels they crossed matters more than the number of fields
they filled in. Baymard Institute's checkout usability audits put the average
flow at 5+ steps with a median of over a dozen form fields, and most of the
abandonment comes from steps that feel like they appeared out of nowhere.

The recipe:

- Use 3 named steps for anything with shipping: Information, Shipping, Payment.
  Digital-only goods can collapse to 2 (Contact, Payment).
- Never introduce a step the buyer wasn't told about, like a surprise
  "create a password" screen after they already pressed "Pay."
- Group fields by the decision they support, not by database table: address
  line 1/2/city/zip is one decision ("where"), not four fields to dread.
- Show the total step count somewhere visible before the first field is touched,
  so the buyer can gauge remaining effort.

Why: perceived effort drives abandonment more than actual effort. A 12-field
single page that is clearly labeled "step 2 of 3: payment" feels shorter than
a 4-field page that appears with no context, because uncertainty about how much
is left is what buyers actually flee from, not keystrokes.

Example: "Step 2 of 3 — Shipping" header above a grouped address block, with a
visible "Continue to Payment" button that previews the next step's name.
Counter-example: a checkout that silently inserts an account-creation screen
between shipping and payment with no step label. Same field count, higher
abandonment, because the buyer now has no idea if there's a step 4, 5, or 6.
