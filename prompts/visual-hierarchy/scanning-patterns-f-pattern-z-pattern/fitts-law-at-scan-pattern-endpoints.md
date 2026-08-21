---
id: scanning-patterns-f-pattern-z-pattern-fitts-law-at-scan-pattern-endpoints
title: Fitts's law at the scan pattern's endpoints
category: visual-hierarchy
subcategory: scanning-patterns
tags: [fitts-law, target-size, touch-targets, cta-sizing]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Knowing where a scan pattern deposits attention only pays off if the element
sitting there is also easy to acquire with a pointer or thumb. Scan-pattern
placement without Fitts's-law sizing produces an element that gets looked at
but not clicked.

The recipe:

- Size the element at a pattern terminus, typically a CTA, to at least
  44x44px on touch and roughly 32px minimum height on desktop; attention
  arriving without an adequately sized target still causes hesitation or
  mis-taps.
- Give terminus elements extra padding relative to mid-pattern elements;
  isolation reduces the chance of a mis-click onto a neighboring stroke's
  element.
- On mobile, align the visual terminus with the thumb-reachable zone, the
  lower two-thirds of the screen; a Z-pattern terminus landing in the top
  third is a scan win but a Fitts's-law loss, since the thumb has to travel.
- Don't shrink a terminus CTA to "let the design breathe"; the pattern already
  spent its budget getting the eye there, undersizing it wastes that work.

Why: scan-pattern research explains where attention lands; Fitts's law
explains how fast and how accurately a hand can act on what's there. Treating
only the first half means winning the look and losing the tap.

Example: a bottom-right CTA sized 56px tall with 24px of clear space on all
sides, positioned within one-handed mobile thumb reach.
Counter-example: a visually correct bottom-right terminus CTA rendered as a
28px text link crammed against the screen edge. Attention arrives; the thumb
doesn't reliably land.
