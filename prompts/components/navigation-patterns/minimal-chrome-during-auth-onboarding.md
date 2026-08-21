---
id: navigation-patterns-auth-onboarding-chrome
title: Suppressing persistent navigation during auth and onboarding
category: component
subcategory: navigation
tags: [navigation, onboarding, auth, focus]
applicability:
  platforms: [web, mobile]
  productTypes: [auth, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Auth and onboarding flows should drop the product's persistent tab bar or
sidebar entirely and replace it with a linear, single-path chrome — a step
indicator and a back arrow at most — because the goal here is completion of one
sequence, not lateral exploration of the product.

- Remove the full nav shell (sidebar, tab bar, top nav links) on sign-up,
  login, password reset, and multi-step onboarding screens; show only a logo
  (optionally linking home) and, if the flow has more than 2 steps, a progress
  indicator (dots, a step count, or a thin progress bar).
- Provide exactly one way to go back a step and, where applicable, one way to
  exit the flow entirely (an X, not a nav bar's worth of alternate
  destinations) — more than two navigational choices at this stage measurably
  increases drop-off.
- Do not surface unrelated product marketing, upsells, or nav links mid-flow;
  every element on screen should serve completing the current step.
- Once onboarding completes, transition directly into the full persistent nav
  shell (sidebar/tab bar) so the change in chrome itself signals "you have
  arrived" at the product.

Why: flows with a single conversion goal perform worse the more competing exits
and destinations exist on screen — this is a well-documented effect in
checkout and signup funnels — because every extra nav affordance is a
plausible reason to leave the sequence uncompleted. Stripping chrome to the
essentials protects the single path to completion.

Example: "onboarding step 2 of 4: logo top-left, progress dots top-center, back
chevron, no sidebar, no tab bar, one primary Continue button."

Counter-example: a sign-up form rendered inside the full app shell, sidebar and
all, so a curious new user clicks into Settings mid-signup and never returns to
finish creating their account.
