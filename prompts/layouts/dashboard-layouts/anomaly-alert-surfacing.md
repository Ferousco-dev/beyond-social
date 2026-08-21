---
id: dashboard-layouts-anomaly-alert-surfacing
title: Surfacing anomalies and out-of-range metrics
category: layout
subcategory: dashboard
tags: [alerts, dashboard, anomaly, status]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A metric that has crossed a meaningful threshold needs a distinct visual
treatment from a metric that's merely fluctuating normally, placed where the
user sees it before they see anything else.

The recipe:

- Reserve a single alert region directly under the page title, above the
  regular widget grid, for anything currently out of range — do not mix
  anomaly banners into the normal card grid where they compete with routine
  stats for attention.
- Use a consistent three-tier visual language: neutral (no badge) for normal
  range, a warning tone for approaching a threshold, and a distinct alert
  tone only for values that have actually crossed a defined line — never use
  the alert tone for normal variance, or the tone stops meaning anything.
- Name the threshold in the alert text itself ("Error rate 4.2%, above the
  2% target") instead of just coloring the number red, so the user
  understands the rule being applied without hovering for a tooltip.
- Auto-dismiss or downgrade an alert the moment the metric returns to normal
  range; a stale alert banner still showing after the issue resolved trains
  users to ignore the banner region entirely.

Why: color and position are the two channels that get processed before
reading comprehension kicks in, so an anomaly needs both a reserved position
and a reserved color to be noticed on a page that also contains normal green-
and-neutral numbers; scattering red text throughout a normal-looking grid
gets lost in the general noise of numbers on the page.

Example: a red banner reading "Render failure rate 6.8%, above the 3%
threshold since 2:14pm" pinned above the stat card row, disappearing once the
rate drops back under 3%.
Counter-example: coloring the failure-rate stat card's text red among an
otherwise identical grid of black-text cards, with no banner and no stated
threshold, so a user has to already know the acceptable range to notice
anything is wrong.
