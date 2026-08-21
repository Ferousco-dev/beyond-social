---
id: buttons-and-ctas-disabled-vs-validation
title: Disabled buttons versus inline validation
category: component
subcategory: buttons-and-ctas
tags: [buttons, forms, validation, disabled-state]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, auth, onboarding, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A disabled submit button tells the user "something is wrong" without telling
them what — in most forms, keeping the button enabled and validating on
submit (or on blur) produces a clearer, faster experience.

The recipe:

- Default to an always-enabled submit button. On click, run validation and
  surface specific inline errors next to the offending fields, then scroll or
  focus to the first error.
- Reserve true disabling for cases where the action is structurally
  impossible, not just incomplete — e.g. "Pay" before a payment method exists,
  or "Publish" before any content has been entered at all.
- If you do disable, pair it with a visible reason near the button ("Add a
  title to publish") rather than a silent gray button the user has to
  investigate.
- Never disable a button purely because one required field among many is
  still empty on a long form — that punishes users for their position in the
  form, not for an actual error.
- Loading and disabled are different states with different treatments; don't
  reuse disabled styling to represent "submitting" (see the loading-state
  pattern).

Why: a disabled button with no explanation shifts the debugging burden onto
the user — they must guess which of N fields is the problem by trial and
error. An enabled button with inline, specific validation turns the same
moment into direct feedback: click, see exactly what's wrong, fix it, submit
again, no guessing.

Example: an enabled "Create account" button that, on click, highlights the
password field in red with "Password must be at least 8 characters."

Counter-example: a signup button that stays grayed out through the entire
form with no message, leaving the user to click every field to find the one
still failing validation.
