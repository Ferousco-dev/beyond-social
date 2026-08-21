---
id: buttons-and-ctas-interaction-states
title: Designing every button interaction state
category: component
subcategory: buttons-and-ctas
tags: [buttons, states, interaction, feedback]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A button component is not one visual, it's six: default, hover, active/pressed,
focus, disabled, and loading. Shipping only the default state and letting the
browser or OS improvise the rest is how buttons end up feeling unfinished.

The recipe:

- Default: the resting state, matched to hierarchy (see button-hierarchy).
- Hover (pointer devices only): a subtle shift — darken or lighten fill by
  roughly 8-10%, never a large color jump that reads as a different button.
- Active/pressed: a slightly stronger shift than hover plus a 1-2px scale-down
  or translate, so the button visibly "gives" under the click, mimicking a
  physical press.
- Focus: a visible outline or ring distinct from hover, present for keyboard
  navigation regardless of pointer state (see the focus-ring pattern).
- Disabled: reduced opacity (40-50%) or desaturated fill, cursor set to
  not-allowed, no hover/active response.
- Loading: replace label with a spinner or keep the label and add a trailing
  spinner, lock dimensions so the button doesn't resize, and disable repeat
  clicks.
- Transitions between states should be fast, 100-150ms — long transitions make
  the interface feel like it's fighting the user's input.

Why: state feedback is how software confirms it heard the user. A button with
no pressed state feels laggy even when the underlying action is instant,
because there was no visual acknowledgment between the click and the result.

Example: a primary button that darkens 8% on hover, scales to 98% on
mousedown, and shows a centered spinner at fixed width during submission.

Counter-example: a button that looks identical from mouseover through click
through form submission, leaving the user to wonder whether their click
registered at all and often clicking again.
