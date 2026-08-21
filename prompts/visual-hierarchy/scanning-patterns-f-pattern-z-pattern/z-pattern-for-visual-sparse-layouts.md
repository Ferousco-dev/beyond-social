---
id: scanning-patterns-f-pattern-z-pattern-z-pattern-for-visual-sparse-layouts
title: The Z-pattern for visually sparse layouts
category: visual-hierarchy
subcategory: scanning-patterns
tags: [z-pattern, eye-tracking, hero-section, layout]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, marketing-site, portfolio]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

On low-text, high-visual layouts (hero sections, splash pages, single-screen
ads) eyes trace top-left to top-right, then diagonally down to bottom-left,
then across to bottom-right: a Z. There's no dense text to force row-by-row
reading, so attention defaults to the corner-to-corner sweep instead.

The recipe:

- Logo or brand mark at top-left, the pattern's start.
- A secondary signal (nav link, badge, social-proof mark) at top-right, the
  end of the first stroke.
- Headline or product shot along the diagonal, roughly the visual center of
  gravity.
- Primary CTA at bottom-right, the pattern's terminus and the highest-attention
  resting point after the sweep completes.
- Keep the diagonal free of competing high-contrast elements; one strong
  diagonal read beats two competing ones.

Why: the Z-pattern only holds when there isn't enough text to force F-pattern
row-sampling. Strip a section down to a handful of words and one image and the
eye defaults to the reading-order sweep baked into how the culture scans a
page, corner to corner, rather than sampling lines of text.

Example: logo top-left, "Sign up free" button bottom-right, product screenshot
sitting on the diagonal between them.
Counter-example: the primary CTA placed top-left next to the logo. It sits at
the pattern's start, where attention velocity is highest and dwell time is
lowest, so it gets seen in passing but never paused on.
