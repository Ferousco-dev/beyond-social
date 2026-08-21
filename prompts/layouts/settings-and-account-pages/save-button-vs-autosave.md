---
id: settings-and-account-pages-save-button-vs-autosave
title: Choosing save behavior per field, not per page
category: layout
subcategory: form-behavior
tags: [settings, autosave, forms, ux]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Whether a settings field autosaves or waits for an explicit Save button
should be decided per field by its consequence, not applied uniformly across
the whole settings page.

The recipe:

- Autosave low-risk, frequently-changed preferences on blur or change (theme,
  display name, notification toggles), confirming with a brief inline
  checkmark or spinner — no Save button needed.
- Require an explicit Save action, with a visible dirty-state indicator, for
  fields with real consequences: email change, password change, plan
  downgrade, anything touching billing or authentication.
- Never autosave a field that triggers an external side effect the moment it
  changes, such as sending a verification email or modifying a charge —
  autosave implicitly promises "no consequence," and breaking that promise
  once teaches users to distrust every autosaved field on the page.
- When a form is dirty, pin a persistent bar to the bottom of the panel
  ("You have unsaved changes — Save / Discard") so navigating away never
  silently discards input.

Why: users infer risk from the interaction pattern itself. A field that
visibly requires "Save" is read as consequential; a field that saves silently
is read as safe to experiment with. Mixing the two without a consistent rule
means users either fear touching safe toggles or, worse, casually flip a
setting they thought needed confirmation and never got.

Example: a "Display name" field autosaves 400ms after the user stops typing,
with a small checkmark fading in; an "Email address" field shows a "Save"
button that stays disabled until the new address passes validation.
Counter-example: a single global Save button at the bottom of a mixed panel
covering both theme and password — a user who only meant to fix a typo in
their theme choice now also silently resubmits, and possibly forgets to set,
a security-relevant field.
