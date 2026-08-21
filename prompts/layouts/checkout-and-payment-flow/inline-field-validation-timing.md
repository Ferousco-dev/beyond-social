---
id: checkout-and-payment-flow-inline-validation-timing
title: Validate on blur, never on the first keystroke or only at submit
category: layout
subcategory: error-recovery
tags: [validation, forms, error-recovery, checkout]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Validate format-only fields the moment the buyer leaves them, not on every
keystroke while they're still typing, and never hold every error back for a
single reveal at final submit.

The recipe:

- Validate format fields (email, card number, zip) on blur, after the buyer
  finishes typing and moves to the next field, not mid-entry.
- Reserve live keystroke feedback for fields where partial input is genuinely
  informative, like a password-strength meter, where "not yet strong enough"
  is true feedback rather than a false alarm.
- Never wait until the final "Pay now" submit to reveal that a field entered
  three steps ago was wrong — that forces the buyer to scroll back and
  reconstruct context they've already mentally discarded.
- Pair timing with placement: the error renders directly below the specific
  field it belongs to, never in a summary block detached from the input.

Why: keystroke-level validation on a format field flags "invalid" while the
buyer is still mid-way through typing a perfectly valid answer — an email
field turning red after the letter "j" trains the buyer to distrust and
ignore the validation entirely by the time an error actually matters.
Batching every error to a final submit screen is worse: it forces the buyer's
working memory to reconstruct which of several already-passed fields was
wrong, adding a second task on top of the one they thought they'd finished.

Example: the card number field turns red only once focus leaves it, with
"Card number looks incomplete" appearing directly beneath.
Counter-example: an email input that shows a red border on the very first
character typed, because "j" alone isn't a valid email address yet —
technically correct, uselessly alarming, and ignored within seconds.
