---
id: dashboard-layouts-status-color-semantics
title: Consistent color semantics for status
category: layout
subcategory: dashboard
tags: [color, dashboard, status, design-tokens]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A color used for status on a dashboard must mean exactly one thing
everywhere it appears, defined once as a semantic token, and never repurposed
for decoration elsewhere on the same screen.

The recipe:

- Define a fixed small set of status tokens (success, warning, danger,
  neutral/in-progress) in one place, and map every status-bearing element on
  the dashboard — delta arrows, badges, table row indicators, alert banners —
  to those same tokens, never to a one-off hex value chosen per component.
- Never use the danger color for anything that isn't actually a problem; a
  brand-red logo mark or an unrelated decorative accent in the same red as
  the failure-state token teaches users to tune out the failure color.
- Pair color with a non-color signal (an icon shape, a text label) for every
  status use, so the status is legible to colorblind users and still scannable
  in black-and-white screenshots or print.
- Keep positive/negative delta color meaning consistent with direction only
  when direction is actually good or bad — a metric where "down" is the
  desired outcome (e.g. render failure rate, page load time) should color a
  decrease green and an increase red, the inverse of a metric like revenue.

Why: once a viewer learns that red means "needs attention" on this
dashboard, that association only holds if red is never used for anything
else on the same screen; a design system that lets each new feature pick its
own accent color for emphasis quietly erodes the one signal the dashboard
depends on to direct attention efficiently.

Example: a single "danger" token (a fixed red hex) used identically for the
failed-render badge, the anomaly banner border, and the negative-delta arrow
on the error-rate card, defined once in the token file.
Counter-example: a "danger" red token for failed jobs alongside an unrelated
bright-red "featured" badge on a promo card elsewhere on the same dashboard,
which trains users to stop reacting to red as a signal.
