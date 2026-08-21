---
id: pricing-page-psychology-annual-monthly-toggle-framing
title: Framing the annual/monthly billing toggle
category: conversion
subcategory: pricing-page-psychology
tags: [billing-period, framing, pricing, toggle]
applicability:
  platforms: [web]
  productTypes: [landing-page, marketing-site, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

How a monthly/annual toggle is defaulted and labeled changes which plan buyers
perceive as cheaper, independent of the actual math, because the number shown
first anchors the whole comparison.

- Default the toggle to annual when annual is the plan you want most buyers on,
  and show the per-month equivalent ($49/mo, billed annually) rather than the
  lump sum, so the number stays comparable to the monthly price nearby.
- Label the savings as a concrete amount and percentage together ("Save $180
  (2 months free)"), not just a percentage; a bare percentage requires mental
  math that most buyers skip, which wastes the framing.
- Keep the toggle itself unmissable but not the primary CTA in size or color;
  it is a modifier, and it should not compete with the plan's own button.
- When a buyer switches to monthly, do not hide or shrink the annual savings
  callout. Removing it feels like the page is hiding information the moment
  it stops helping the seller, which reads as manipulative.

Why: this relies on the same reference-price mechanism as anchoring, but
applied to a toggle instead of a static badge. Because the monthly-equivalent
number is what stays on screen at all times, it becomes the reference point the
buyer carries through the rest of the comparison, even after they have mentally
committed to paying annually. Losing that number to a lump-sum annual total
breaks the comparison and forces the buyer to redo math they already
outsourced to the page.

Example: toggle defaulted to "Annual," card reads "$39/mo" with "billed
$468/yr — save $120" directly beneath in smaller text.
Counter-example: toggling to annual swaps the display to a single lump sum
"$468/year" with no per-month equivalent, forcing the buyer to divide by 12 to
compare against the monthly plan they were just looking at.
