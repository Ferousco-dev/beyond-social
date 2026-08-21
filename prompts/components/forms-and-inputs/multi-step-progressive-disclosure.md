---
id: forms-and-inputs-multi-step-progressive-disclosure
title: Multi-step forms and progressive disclosure
category: component
subcategory: forms-and-inputs
tags: [forms, multi-step, onboarding, progress]
applicability:
  platforms: [web, mobile]
  productTypes: [onboarding, saas-dashboard, auth, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Splitting a long form into steps reduces perceived effort, but only when each
step is a real grouping of related fields and the user always knows how much
is left.

The recipe:

- Split by logical grouping (contact info, then payment, then review), never
  by arbitrary field count — a step should feel like one decision, not a
  random slice.
- Show a persistent progress indicator (step counter or progress bar) with
  the total number of steps visible from step one, so the user can judge
  effort before committing.
- Preserve entered data when the user goes back a step; re-clearing fields on
  back-navigation is one of the most punishing failures in multi-step forms.
- Put the highest-friction, most-likely-to-drop-off field (payment details,
  identity verification) later in the sequence, after the user has already
  invested effort in earlier steps.
- Let the final step be a review screen that shows every answer with an edit
  link back to its step, rather than forcing a full restart to fix one field.

Why: chunking a long form doesn't reduce the total work, it reduces the
work visible at once, which lowers the perceived cost of starting. That
benefit disappears the moment back-navigation loses data or the step count is
hidden, because both turn the multi-step form into a trap instead of a path.

Example: a 3-step signup — "Your info" / "Choose a plan" / "Payment" — with a
"Step 2 of 3" label and a back button that returns to a fully preserved step 1.

Counter-example: a form split into 6 steps of one field each, with no visible
step count, so the user has no way to know if step 4 is almost done or halfway.
