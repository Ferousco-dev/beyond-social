---
id: pairing-and-scale-systems-weight-axis-hierarchy
title: Weight axis as hierarchy instead of a second family
category: typography
subcategory: pairing-and-scale-systems
tags: [typography, pairing, variable-fonts, weight]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.83
---

A variable font's weight axis can carry hierarchy on its own, letting one
family express UI chrome, body copy, and emphasis through weight steps instead
of reaching for a second typeface, which keeps proportions and spacing
perfectly consistent across every level.

- Map weights to roles explicitly: 400 for body, around 500 for labels and UI
  chrome, 600 to 650 for subheadings, 700 to 800 for primary headlines, and
  anything above 800 reserved for rare, single-word emphasis.
- Use the variable axis directly (font-weight: 538, not just the named
  instances) when the design needs a step between standard weights, such as a
  UI label that should sit visually between Regular and Medium.
- Combine weight steps with size steps rather than relying on weight alone at
  a single size; two adjacent weights at the same size can look like a
  rendering inconsistency rather than a deliberate hierarchy signal.
- This is the right default when the brand doesn't need the added
  distinctiveness a second display face would bring; it trades personality for
  consistency and simplicity.

Why: a single variable family shares glyph proportions, spacing tables, and
metrics across its entire weight range, so moving through weight never
introduces the x-height or kerning mismatches that pairing two separate
typefaces can. Weight-only hierarchy is the lowest-risk way to build a scale
when execution consistency matters more than brand distinctiveness.

Example: Inter Variable: 400 body, 500 form labels, 650 card titles, 800 hero
headline, one family, four roles.

Counter-example: introducing a second bold display face purely to make section
headers "pop" when a single weight step up, from 500 to 700, in the existing
family would have done the job with zero added pairing risk.
