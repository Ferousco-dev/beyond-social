---
id: forms-and-inputs-helper-text-vs-tooltip
title: Helper text versus tooltip versus inline error
category: component
subcategory: forms-and-inputs
tags: [forms, helper-text, tooltip, error-handling]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, onboarding, auth]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Helper text, tooltips, and inline errors all deliver supplementary
information about a field, but they differ in cost-to-access, and matching the
wrong one to the situation either hides critical information or clutters a
form with things nobody needed to read.

The recipe:

- Use always-visible helper text for information every user needs before
  typing correctly the first time (password rules, required file format,
  why a sensitive field like SSN is being asked for).
- Use a tooltip (icon-triggered, revealed on hover/tap) only for information
  most users won't need but a few will want on demand — a definition of a
  technical term, or the reasoning behind a less obvious field.
- Never put a tooltip on the one piece of information required to fill the
  field correctly; if most users need it, it must be visible by default, not
  gated behind an extra interaction.
- Use inline error text exclusively for validation failures, appearing only
  after a real error occurs, and clear it the moment the error is resolved —
  don't reuse the error slot to also carry general hints.
- On mobile, avoid hover-only tooltips entirely since there's no hover; use a
  tap-triggered popover or fold the content into visible helper text instead.

Why: each of these three has a different attention cost — helper text is free
(read passively while scanning), a tooltip costs a deliberate action, and an
inline error demands immediate attention because it's blocking progress.
Assigning information to the wrong cost tier either buries something
essential behind a tap nobody makes, or clutters the passive-read layer with
detail only power users wanted.

Example: helper text "We use this to calculate shipping time" under a zip
field; a (?) tooltip next to "API rate limit" explaining what it technically
means; a red inline error appearing only after an invalid zip is submitted.

Counter-example: password requirements hidden behind a small (?) icon tooltip,
so most users only discover the rules after submitting and getting rejected.
