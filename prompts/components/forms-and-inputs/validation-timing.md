---
id: forms-and-inputs-validation-timing
title: When to validate a field
category: component
subcategory: forms-and-inputs
tags: [forms, validation, timing, error-handling]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, saas-dashboard, marketing-site, auth, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Validation timing determines whether a form feels helpful or hostile. The single
biggest mistake is validating on every keystroke before the user has finished
typing, which punishes them for being mid-thought.

The rule set:

- Never validate format errors (email shape, card number, password rules) until
  the field loses focus (blur) or the user pauses typing for ~500ms.
- Once a field has been marked invalid, switch to real-time validation for that
  field only, so the error clears the instant the user fixes it.
- Validate presence (required-field emptiness) only on blur or submit, never
  on focus-in, since an empty field the user hasn't touched yet isn't an error.
- Async checks (username availability, coupon code) should show a pending state
  immediately and resolve without blocking further typing.
- On submit, re-validate everything and scroll to and focus the first invalid
  field.

Why: validating too early treats an incomplete answer as a wrong answer, which
reads as the interface arguing with the user before they've made their case. The
blur-then-live pattern mirrors how a person actually reviews a form: they don't
expect judgment until they've committed an answer, but once corrected, they want
instant confirmation they got it right without needing to click away again.

Example: email field shows no error while typing "j.doe@" and only evaluates
format after blur; once flagged, it re-checks on every keystroke until valid.

Counter-example: an email field that turns red after the third character typed.
This forces the user to finish typing while staring at an error state that was
never actually final, training them to distrust the validation entirely.
