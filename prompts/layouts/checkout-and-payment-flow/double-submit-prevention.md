---
id: checkout-and-payment-flow-double-submit-prevention
title: Lock the pay button the instant it's tapped
category: layout
subcategory: error-recovery
tags: [payment, double-charge, error-recovery, checkout]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Disable and visually change the pay button the instant it's tapped, so a slow
network connection can never turn one tap into two separate charges.

The recipe:

- On click, immediately disable the submit button and swap its label to a
  spinner plus "Processing…" before the network request even resolves.
- Lock the form so a second tap — common when a buyer assumes the first one
  didn't register on a slow connection — is a no-op, never a second charge
  attempt.
- Hold the processing state through back-button presses or tab switches
  until the processor actually responds; a `beforeunload` warning during
  this window is appropriate, a silently resettable button is not.
- On timeout, poll the actual charge status server-side before offering a
  retry, rather than assuming failure and letting the buyer resubmit into a
  duplicate authorization.

Why: payment is the one part of checkout where a UI mistake has a direct
monetary consequence — a double-tap that reads as two separate submissions
can create two real authorization holds on a buyer's card. The fix costs
nothing in perceived speed: a spinner reads as the interface working, not
stalling, so disabling immediately trades zero usability for eliminating an
entire class of billing support tickets.

Example: the button changes from "Pay $84.00" to a disabled gray state with
a spinner and "Processing your payment…" within the same click event.
Counter-example: a button that stays fully clickable and unchanged while the
network call is in flight, so an impatient buyer on spotty wifi taps it
three times and generates three separate authorization holds.
