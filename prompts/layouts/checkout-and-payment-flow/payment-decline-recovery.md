---
id: checkout-and-payment-flow-decline-recovery
title: A declined card recovers in place, never from step one
category: layout
subcategory: error-recovery
tags: [error-recovery, payment-decline, checkout, conversion]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A declined card should recover on the same screen with a specific reason,
never by sending the buyer back to the start of the flow.

The recipe:

- Surface the actual decline reason the processor returns when available —
  insufficient funds, incorrect CVV, expired card — instead of a generic
  "Payment failed" message.
- Keep every already-entered field intact; reset only the payment fields,
  never the shipping or contact details the buyer already confirmed.
- Offer an express wallet button as a one-tap alternative right beside the
  retry option, since a second attempt with the same failing card has a real
  chance of failing again.
- Never restart the multi-step flow from step one on decline; stay on the
  payment step with focus already moved into the field that needs fixing.

Why: processor decline codes like insufficient_funds and incorrect_cvc map
to genuinely different buyer actions — one needs a different card, the other
just needs a retyped three digits. A generic error forces the buyer to guess
which fix applies, and restarting the whole flow from step one punishes them
for a bank-side failure that had nothing to do with the shipping address
they already got right the first time.

Example: "Your card was declined: incorrect CVV. Please re-enter your
security code," with focus jumped straight to the CVV field and the rest of
the form untouched.
Counter-example: "Something went wrong. Please try again," with the entire
form cleared and the buyer dropped back at the shipping step.
