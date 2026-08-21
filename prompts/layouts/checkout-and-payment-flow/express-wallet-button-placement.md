---
id: checkout-and-payment-flow-express-wallet-placement
title: Express wallet buttons go above the manual card form
category: layout
subcategory: payment-methods
tags: [apple-pay, google-pay, checkout, conversion, mobile]
applicability:
  platforms: [web, mobile, ios, android]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Express wallets (Apple Pay, Google Pay, PayPal) collapse checkout to one tap
and only deliver that benefit if they're the first thing the buyer sees, not
a secondary option beneath a full form they've already filled out.

The recipe:

- Render wallet buttons at the very top of the payment step, before any
  manual field renders.
- Use the platform's official button asset (Apple's JS-rendered Apple Pay
  button, not a custom icon substitute), which preserves both trust and HIG
  compliance.
- Insert a plain divider, "Or pay with card," between the wallet buttons and
  the manual form so the two paths stay visually distinct.
- Detect capability before rendering — Apple Pay only where Safari has a
  configured wallet, Google Pay only where the API resolves — since a button
  that does nothing on tap destroys trust faster than no button at all.
- Make wallet buttons full-width and at least 44pt tall on mobile to meet
  standard tap-target minimums.

Why: wallet checkout skips every high-friction field at once — card number,
expiry, CVV, billing address — because the OS already holds that data behind
biometric auth. Every field the eye parses before reaching the express option
is a chance to abandon, so the fast path only earns its conversion lift when
it's the first thing offered, not a reward for finishing the slow path.

Example: full-width Apple Pay button at the top of the step, gray "or"
divider, then the card number field below it.
Counter-example: a small wallet icon placed in a row after the full card form
has already been filled in — by the time the buyer reaches it, they've
already done the work the button existed to prevent.
