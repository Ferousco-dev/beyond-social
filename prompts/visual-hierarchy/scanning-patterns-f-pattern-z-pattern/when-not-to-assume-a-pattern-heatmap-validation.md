---
id: scanning-patterns-f-pattern-z-pattern-when-not-to-assume-a-pattern-heatmap-validation
title: When not to assume F or Z, and how to check instead
category: visual-hierarchy
subcategory: scanning-patterns
tags: [heatmap, validation, eye-tracking, design-process]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

F- and Z-patterns are defaults derived from specific study conditions: text
density, left-to-right script, desktop viewport, unfamiliar content. Plenty of
real layouts don't match those conditions, so applying the pattern as a fixed
rule instead of validating it against actual eye-tracking or click-heatmap
data produces confident, wrong design decisions.

The recipe:

- Treat F, Z, and Gutenberg as starting hypotheses for a first layout draft,
  not a substitute for measurement once the page has real traffic.
- Run a click or attention heatmap (or scroll-depth plus click-position data
  as a proxy) after launch, and compare it against the assumed pattern before
  reusing that pattern on future pages.
- Watch for known pattern-breakers: returning users jump straight to known
  landmarks and skip the default pattern entirely; numbered or bulleted lists
  produce a vertical column-read closer to a table than an F; dense nav or
  breadcrumb trails can spin up secondary local scan loops that override the
  page-level pattern.
- When heatmap data contradicts the assumed pattern, trust the data and
  rebuild the hierarchy around the actual hot zone, not the textbook one.

Why: F and Z describe average behavior on specific study material. Any real
page has its own content density, familiarity level, and script, so the
pattern is a prior to update, not a law of physics. Shipping on the prior
alone, and never checking the posterior, is how "the CTA is in the right
place per best practice" and "nobody clicks the CTA" end up true at once.

Example: after launch, a heatmap shows returning users jumping straight to the
pricing link in the nav, bypassing the hero's Z-pattern path entirely, so the
hero gets simplified for that segment.
Counter-example: designing five landing pages with the CTA in the Gutenberg
terminal area purely on the strength of the textbook pattern, never once
pulling a heatmap to check whether this audience and content actually scans
that way.
