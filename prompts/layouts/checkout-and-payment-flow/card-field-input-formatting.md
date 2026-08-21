---
id: checkout-and-payment-flow-card-field-formatting
title: Auto-format card fields so the buyer never types spaces or tabs manually
category: layout
subcategory: form-design
tags: [card-input, form-design, mobile, checkout]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Auto-format and auto-detect card input in real time so the buyer never has to
manually insert spaces, dashes, or guess which field comes next.

The recipe:

- Auto-insert a space every four digits as the card number is typed, and
  auto-advance focus to the expiry field once the full number (16 digits, or
  15 for Amex) is entered.
- Detect the card network from the first four to six digits and show the
  matching logo live — this also sets the correct CVV length expectation,
  3 digits for Visa/Mastercard, 4 for Amex.
- Use `inputmode="numeric"` with the matching `pattern` attribute so mobile
  keyboards default to the numeric pad instead of the full alphanumeric one.
- Mask the CVV as dots once entered but keep the card number visible in
  plain digits — CVV is the field buyers mistype most often, and a mask
  forces a deliberate second look before submitting.

Why: bank-issued cards standardize their digit groupings for a reason —
honoring that grouping in the UI reduces perceived complexity even though
the underlying validation logic is identical either way. On mobile
specifically, every unnecessary keyboard switch or manual tab between fields
is a chance for a thumb to mis-tap and lose the field entirely, so removing
that manual step has an outsized effect on completion for exactly the
segment least tolerant of friction.

Example: typing "4242424242424242" auto-spaces to "4242 4242 4242 4242" and
moves focus to the MM/YY field the instant digit sixteen lands.
Counter-example: a raw, unformatted text input with the default keyboard on
mobile and no auto-advance, forcing the buyer to manually tap between three
separate fields for card number, expiry, and CVV.
