---
id: cognitive-load-and-progressive-disclosure-wizard-vs-single-page-flows
title: Choosing a wizard over a single long page
category: ux-heuristic
subcategory: progressive-disclosure
tags: [wizard, multi-step-form, progressive-disclosure, cognitive-load]
applicability:
  platforms: [web, mobile]
  productTypes: [onboarding, saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A wizard is progressive disclosure applied to time instead of space — it trades
the ability to see the whole task at once for the guarantee that the user is
never shown more than one decision's worth of fields — and it's the right trade
only when the steps have a genuine dependency order.

The recipe:

- Split into a wizard only when later steps depend on earlier answers (a
  video's format determines which aspect-ratio options are valid); if every
  field is independent, a single scannable page is faster to complete.
- Show step count and current position at all times ("Step 2 of 4"), and make
  every completed step clickable to revisit — a wizard without backward
  navigation feels like a trap, not a guide.
- Keep each step to one decision or one tightly related cluster of fields, not
  an arbitrary chunk sized to make the step count look shorter.
- Autosave on every step transition so leaving mid-flow and returning resumes
  exactly where the user left off, with prior answers intact.
- Default to a single page for anything under roughly five fields — the
  overhead of step transitions costs more than it saves when there's nothing
  left to hide.

Why: a long single page lets an experienced user see the entire task and route
around it (skip fields, fill out of order), while a wizard removes that
overview to guarantee no one is confronted with fifteen fields at once. That
guarantee is worth the lost overview only when the steps are genuinely
sequential; imposed on independent fields, it just adds click-through latency
to a task that didn't need staging.

Example: create-a-video flow: Step 1 pick format, Step 2 shows only the aspect
ratios valid for that format, Step 3 shows only compatible voice options.

Counter-example: a four-step wizard for editing a profile (name, then bio, then
avatar, then handle) where none of the fields depend on each other — it should
be one page with four independent inputs.
