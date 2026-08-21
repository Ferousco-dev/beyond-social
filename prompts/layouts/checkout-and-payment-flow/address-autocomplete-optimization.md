---
id: checkout-and-payment-flow-address-autocomplete
title: Wire address fields to standard autocomplete tokens exactly
category: layout
subcategory: form-design
tags: [autofill, address, form-design, mobile]
applicability:
  platforms: [web, mobile, ios, android]
  productTypes: [e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Wire every address field to browser and OS autofill using the exact standard
`autocomplete` attribute values, because one mislabeled field silently breaks
autofill for the entire block and forces a full manual retype.

The recipe:

- Use exact tokens — `name`, `email`, `tel`, `address-line1`,
  `address-line2`, `address-level2`, `postal-code`, `country` — rather than
  custom or omitted values; browsers and password managers pattern-match on
  these strings specifically, not on placeholder text or field labels.
- Offer a single address search-as-you-type field (Google Places or
  equivalent) as the primary path, with manual line1/line2/city/state/zip
  fields as a visible fallback, not the other way around.
- Order fields the way autofill APIs expect to write them — name, then
  address, then city/state/zip, then phone — so one autofill call correctly
  populates every box without skipping or misplacing one.
- Test on iOS Safari and Android Chrome separately; their autofill
  heuristics diverge, and a field set that fills cleanly on one can silently
  fail on the other with no visible error.

Why: OS-level autofill is the single largest speed unlock available in
checkout, replacing ten keystroke-heavy fields with one tap, but it depends
entirely on markup matching spec exactly. A single mislabeled input, like
`name="street"` instead of `autocomplete="address-line1"`, breaks the whole
chain silently — the buyer never learns why the form felt slower than every
other site, they just experience it as friction with no obvious cause.

Example: `<input autocomplete="address-line1">` paired with a Places
Autocomplete field that pre-fills city, state, and zip on selection.
Counter-example: address fields marked `autocomplete="off"` or given custom
names like `streetAddr1` — autofill does nothing, silently, every time.
