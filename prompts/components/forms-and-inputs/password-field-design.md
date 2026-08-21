---
id: forms-and-inputs-password-field-design
title: Password field visibility and strength feedback
category: component
subcategory: forms-and-inputs
tags: [forms, password, security, feedback]
applicability:
  platforms: [web, mobile]
  productTypes: [auth, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A password field's job is to let the user enter a value they can't see while
still giving them confidence they typed it correctly, and strength feedback
should teach rather than just gate.

The recipe:

- Include a show/hide toggle (eye icon) on every password field by default;
  masked-only entry with no way to verify increases typo-driven failed
  attempts and reset requests.
- Default to masked (dots), not revealed, so shoulder-surfing in public isn't
  the default state — the toggle is opt-in disclosure, not opt-out masking.
- Show strength feedback as a live, specific checklist (has 8+ characters, has
  a number, has a symbol) with checkmarks appearing as each rule is met,
  rather than a single color bar with no explanation.
- Never reject a password after submission for a rule that wasn't stated
  up front; state every requirement before or during typing, not as a
  post-submit surprise.
- On login (not signup) forms, skip strength feedback entirely — it's
  irrelevant once an account already exists and only adds clutter.

Why: password fields are one of the highest-anxiety inputs in any form because
a mistake is invisible until submission fails; visibility and specific,
progressively-checked feedback convert that anxiety into a legible task the
user can visibly verify as they go.

Example: signup password field with a live checklist — "✓ 8+ characters, ✓ 1
number, ○ 1 symbol" — updating a rule to checked the instant it's satisfied.

Counter-example: a password field with no show toggle and no strength
indicator, that rejects the submission after clicking "Sign up" with "password
must contain a symbol," a rule never mentioned until failure.
