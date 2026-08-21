---
id: screen-reader-and-aria-patterns-form-error-association
title: Associating and announcing form validation errors
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, forms, validation, aria-invalid, error-messages]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce, onboarding, auth]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A red border and error text below a field communicate nothing to a screen
reader unless the error is both linked to its field and announced at the
moment it appears, two separate requirements that a single red outline does
not satisfy.

- Set `aria-invalid="true"` on the field itself when validation fails, removed
  again once corrected — this is what makes a screen reader prefix the field
  with "invalid" when the user tabs back to it.
- Point `aria-describedby` at the id of the error message text, in addition to
  any existing `aria-describedby` reference (e.g. help text) — concatenate ids
  space-separated rather than overwriting, so both are read.
- On submit-time validation, move focus to the first invalid field and ensure
  its error text is already in the DOM before or at the moment focus lands, so
  the screen reader announces the field name immediately followed by its error.
- For inline, as-you-type validation, put the error message in a `polite`
  live region so it's announced without interrupting typing, but don't validate
  and announce on every keystroke — debounce to on-blur or a pause in typing,
  or the constant interruption becomes worse than the error itself.
- Write the error message to name the problem and the fix ("Enter a valid email
  address, e.g. name@example.com"), not just a state ("Invalid") — a screen
  reader user hearing only "Invalid" after the field name has no idea what to
  change.

Why: `aria-invalid` and `aria-describedby` are what let a screen reader
announce "Email, invalid, enter a valid email address" as a single coherent
unit when focus reaches the field, matching the same information a sighted
user gets in one glance at red text below the input.

Example: `<input aria-invalid="true" aria-describedby="email-error"><span id="email-error" role="alert">Enter a valid email address</span>`.
Counter-example: red border via CSS class only, error text below with no `id`,
no `aria-describedby` on the input, and focus left wherever it was on submit.
