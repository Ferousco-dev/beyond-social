---
id: forms-and-inputs-label-position-patterns
title: Label position patterns
category: component
subcategory: forms-and-inputs
tags: [forms, labels, layout, accessibility]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, saas-dashboard, marketing-site, auth, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Where a label sits relative to its input changes how fast the eye can scan the
whole form, and floating labels in particular trade a compact look for real
usability costs.

The guidance:

- Default to top-aligned, static labels sitting directly above the input: they
  give the fastest scan speed because the eye moves in one vertical line down
  labels, then one vertical line down inputs, with minimal saccade distance.
- Avoid labels that float from placeholder position into a small caption above
  the field on focus: the field is unlabeled the instant before focus, which
  breaks for anyone scanning a partially filled form, and the animated jump
  briefly disorients users with vestibular sensitivity.
- Reserve inline (left-aligned, same-row) labels for short, highly regular
  forms like a settings table, where users already know every label and are
  scanning for the value, not reading each label fresh.
- Never rely on placeholder text as the only label; it disappears the moment
  the user types, so returning to review the form leaves the field unlabeled.
- Keep label-to-input distance smaller than input-to-next-label distance so
  proximity groups each label with its own field rather than the one below it.

Why: label position is a scanning-speed problem before it's a style problem.
Top-aligned labels minimize eye travel and stay visible at every state of the
field (empty, focused, filled, errored), which is why they benchmark fastest in
completion-time studies across form lengths.

Example: "Email address" in a static 13px label directly above a full-width
input, with 4px of space to the input and 20px of space to the next label.

Counter-example: a placeholder reading "Email address" inside the input with no
separate label, gone as soon as the user types, leaving no way to confirm which
field is which on a filled-out form.
