---
id: checkout-and-payment-flow-mobile-keyboard-optimization
title: Match each field's mobile keyboard to its actual data type
category: layout
subcategory: form-design
tags: [mobile, keyboard, form-design, input-type]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Match each field's on-screen keyboard to its data type explicitly — the
default alphanumeric keyboard is the wrong choice for most fields in a
checkout form.

The recipe:

- Email field: `type="email"` to surface the `@` and `.com` row on the
  on-screen keyboard.
- Phone field: `type="tel"` to surface the numeric dial pad directly.
- Card number, CVV, and zip: `inputmode="numeric"` for a number pad without
  the full alphabet crowding the layout.
- Name and address fields: default text keyboard, but with
  `autocapitalize="words"` so "john smith" becomes "John Smith" without a
  manual shift-tap before every word.

Why: on a phone, every mismatched keyboard is a tax paid twice — once for
the buyer to manually switch modes, which most people don't bother finding
mid-checkout, and again in the higher mis-tap rate of hunting for a "1" on a
full QWERTY layout instead of a dedicated number pad. Specifying the correct
input type is a one-line change per field with an outsized effect on
mobile-specific completion rate, because it removes friction the buyer never
consciously notices as friction — it just feels like the form is fighting
them.

Example: `<input type="tel" inputmode="numeric" autocomplete="cc-number">`
on the card number field triggers the numeric pad directly, no manual
switching required.
Counter-example: every checkout field left as a generic
`<input type="text">`, forcing the buyer to manually switch to the
numbers-and-symbols keyboard for every single numeric field on the form.
