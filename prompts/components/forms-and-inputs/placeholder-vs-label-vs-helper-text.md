---
id: forms-and-inputs-placeholder-vs-label-vs-helper-text
title: Placeholder text versus label versus helper text
category: component
subcategory: forms-and-inputs
tags: [forms, placeholder, labels, helper-text]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, onboarding, auth]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Placeholder, label, and helper text answer three different questions — what
is this field, what format do you want, and what should I know before typing
— and collapsing them into one element loses information the user needed.

The recipe:

- Label answers "what is this field": always present, always visible, never
  disappears when the user types or focuses.
- Helper text (small text below the field) answers "what should I know" —
  formatting rules, why the data is needed, privacy notes — and stays visible
  throughout, unlike placeholder.
- Placeholder answers "what does a valid example look like" — use it only for
  a literal example value ("e.g. jane@company.com"), never as a substitute
  label, and accept that it vanishes on the first keystroke.
- Never put critical information only in the placeholder — anything the user
  must know to complete the field correctly belongs in the label or helper
  text, which persist.
- Keep placeholder text in a lighter, clearly de-emphasized color from real
  input text, so a partially filled field never reads as already complete.

Why: placeholder text has the shortest lifespan of any form copy — present
only in the single moment before the first keystroke — so any instruction
placed there is read by a user who hasn't started typing and unavailable to a
user who has, which is precisely the moment instructions are usually needed.

Example: label "Company website", helper text "Include https://", placeholder
"e.g. https://acme.com" — all three visible before typing, two of three after.

Counter-example: a field with no visible label, just placeholder text reading
"Company website (include https://)" — once the user types one character, both
the field's identity and its formatting rule disappear simultaneously.
