---
id: micro-interactions-form-validation-feedback
title: Form field validation feedback
category: motion
subcategory: interaction-design
tags: [forms, validation, error-state, feedback]
applicability:
  platforms: [web, mobile]
  productTypes: [auth, onboarding, saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Inline validation motion should clearly distinguish "you made an error" from
"this is now correct," and it should never fire while the user is still in the
middle of typing a first answer.

- Validate on blur for the first pass, not on every keystroke; live re-validation
  as the user types is only appropriate after an error has already been shown
  once for that field.
- Error state: border/label color change plus a short horizontal shake, about
  three cycles over 200ms total, ease-in-out, combined with the error message
  sliding down 150ms rather than appearing instantly.
- Success state should have no shake at all: fade in a checkmark icon over
  roughly 150ms. Motion on a success state should feel like a quiet confirmation,
  not an event.
- Do not mark a field as an error simply because it's empty and the user hasn't
  reached it yet; empty-but-untouched is a neutral state, not an error state.
- Keep the shake amplitude small (2-4px total travel); a wide shake reads as
  alarming rather than informative and can feel punitive for a minor typo.

Why: the shake gesture is borrowed from a physical head-shake "no" and is
immediately legible, but it only reads as helpful feedback when it's reserved for
an input the user has actually finished and gotten wrong. Firing it on every
keystroke of a field still being typed (an email address shaking before the "@" is
even typed) punishes normal typing behavior, trains users to distrust the
validation, and makes them tense before submitting any form at all.

Example: on blur, if invalid: `.field { animation: shake 200ms ease-in-out; } .field-error { animation: slideDown 150ms ease-out; }`

Counter-example: a live-validating email field that turns red and shakes on every
keystroke until a complete, valid address is typed. The user sees a wall of red
error state for the entire time they're typing a perfectly normal address.
