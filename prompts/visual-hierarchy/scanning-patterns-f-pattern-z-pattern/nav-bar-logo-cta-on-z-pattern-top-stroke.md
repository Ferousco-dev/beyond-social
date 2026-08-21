---
id: scanning-patterns-f-pattern-z-pattern-nav-bar-logo-cta-on-z-pattern-top-stroke
title: Nav bar layout as the Z-pattern's first stroke
category: visual-hierarchy
subcategory: scanning-patterns
tags: [navigation, z-pattern, information-architecture, layout]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

The top stroke of the Z-pattern, top-left to top-right, is exactly where a nav
bar sits. Nav layout should be treated as the pattern's first stroke, not as a
separate design decision made in isolation from how the rest of the page scans.

The recipe:

- Logo at the absolute top-left, the first pixel the eye contacts.
- Primary nav links in the middle, read as a fast sweep rather than individually
  fixated on, unless one carries deliberately higher contrast.
- Account or CTA button at top-right, ending the first stroke at a decision
  point.
- Keep the stroke's item count low, five to seven max; each added item shortens
  dwell time on everything else, including the CTA at the end.
- Don't put the highest-priority action mid-nav; items in the middle of a
  sweep get passed over, not stopped on.

Why: the top stroke is a high-velocity, low-dwell segment of the scan. It's
useful for orientation, where am I, who is this, and for a single terminal
decision at the end, but it's a poor place for anything that needs
consideration time from the reader.

Example: logo left, "Pricing / Docs / Blog" center, "Start free trial" button
top-right.
Counter-example: a nav listing "Enterprise, Pricing, Case Studies, Blog,
Careers, Docs, Support, Login, Sign up." Nine items flatten the sweep and the
CTA at the end loses its terminal weight.
