---
id: dashboard-layouts-empty-state-design
title: Designing the zero-data dashboard state
category: layout
subcategory: dashboard
tags: [empty-state, dashboard, onboarding, first-run]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A dashboard with no data yet is not a smaller version of the populated
dashboard — it is a different screen with a different job: get the user to
the action that produces the first data point.

The recipe:

- Replace every widget that would render on real data with a state that
  names what will appear there once data exists ("Your render success rate
  will show here after your first job completes"), not a blank card, a
  spinner that never resolves, or a chart drawn with fabricated placeholder
  numbers.
- Keep exactly one primary call to action visible above the fold — the single
  next step that produces data (e.g. "Create your first video") — and make it
  the only high-contrast element on the screen.
- Do not render the full widget grid at reduced opacity; that pattern implies
  something is loading when nothing is, and users wait for content that never
  arrives.
- If the product has example or template content, offer it as an explicit,
  labeled option ("View a sample dashboard") rather than silently mixing
  sample and real data in the same view.

Why: a populated dashboard's whole design assumes there is a headline number
worth looking at; without one, every pattern built for the populated case
(hero metric, sparkline, delta) has nothing true to say, and rendering it
anyway either shows misleading zeros or an empty shell that reads as broken
rather than as new.

Example: a single centered card reading "No renders yet" with a primary
button "Generate your first video" and the rest of the grid removed rather
than grayed out.
Counter-example: the full populated dashboard layout rendered with every
number at 0 and every sparkline flat, which reads as an error state rather
than an intentional first-run screen.
