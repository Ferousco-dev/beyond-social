---
id: cognitive-load-and-progressive-disclosure-onboarding-checklist-pacing
title: Pacing an onboarding checklist instead of front-loading it
category: ux-heuristic
subcategory: progressive-disclosure
tags: [onboarding, checklist, progressive-disclosure, cognitive-load]
applicability:
  platforms: [web, mobile]
  productTypes: [onboarding, saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

An onboarding checklist should reveal its next item only after the current one
is done, not present every setup task at once — the full list up front turns a
sequence of small wins into one visible pile of unfinished work.

The recipe:

- Show one active task at a time, with completed tasks collapsed into a
  checkmark row above it and future tasks either hidden or dimmed and
  unclickable below it.
- Order tasks by dependency and by time-to-value, not by internal setup order —
  the task that produces the first visible result (generate one video) should
  come before administrative tasks (invite teammates, set billing).
- Make the checklist itself dismissible and reopenable from a fixed location,
  so it never blocks the interface but is never more than one click to resume.
- Celebrate each completed step distinctly and briefly — a checkmark animation
  under 500ms — rather than saving all positive feedback for a "you're all set"
  screen at the very end.
- Cap total steps at five or fewer for the checklist itself; anything beyond
  that belongs in ongoing empty-state teaching rather than a single onboarding
  sequence, because a six-plus-item checklist starts reading as a chore list.

Why: a fully expanded checklist discloses the entire remaining workload in one
glance, which is accurate but demotivating — five unchecked boxes look like
five obligations. Revealing one task at a time discloses the same total work
but frames each moment as a single, achievable next step, and the collapsing
checkmarks give a visible trail of progress that a flat, all-visible list
doesn't provide as legibly.

Example: onboarding shows only "Generate your first video" as an active card;
completing it collapses to a checkmark and reveals "Invite a teammate" next.

Counter-example: a sidebar showing all seven onboarding steps unchecked
simultaneously from the first login — technically informative, but it reads as
a long chore list before the user has done anything at all.
