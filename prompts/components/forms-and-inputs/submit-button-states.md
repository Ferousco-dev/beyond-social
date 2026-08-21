---
id: forms-and-inputs-submit-button-states
title: Submit button loading and disabled states
category: component
subcategory: forms-and-inputs
tags: [forms, buttons, loading-states, feedback]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, auth, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A submit button has to communicate three distinct states clearly — ready,
working, and blocked — and conflating any two of them produces either
duplicate submissions or a button the user thinks is broken.

The recipe:

- Keep the button enabled and clickable even when required fields are still
  empty; clicking it should trigger validation and reveal errors, rather than
  the button silently doing nothing while permanently disabled.
- On click, immediately switch to a loading state (spinner replacing or
  alongside the label, e.g. "Submitting…") and disable further clicks, so a
  slow network can't produce duplicate submissions from repeated taps.
- Never change the button's width or position when it enters the loading
  state; swap only the label/icon in place so nothing else on the page shifts.
- Restore the button to its normal state and show an inline error if
  submission fails, rather than leaving it stuck in a permanent spinner with
  no explanation.
- Reserve a true disabled (grayed-out, unclickable) state for cases outside
  the user's control right now — an unpaid invoice, a feature gated behind a
  plan upgrade — not for "form incomplete," which the user can act on
  immediately if told what's missing.

Why: an always-clickable button that validates on click teaches the user what's
wrong by attempting the action, which is faster than requiring them to
correctly guess which field is holding a permanently-disabled button hostage;
a distinct loading state prevents the far more costly failure of a duplicate
charge or duplicate record from a double-tap.

Example: "Create account" stays clickable; on click with an empty password
field, it triggers the field's error and does not submit; with valid data, it
becomes "Creating account…" with a spinner, same width, until it resolves.

Counter-example: a signup button permanently grayed out until every field
passes validation, giving the user no way to trigger feedback about which of
six fields is still wrong.
