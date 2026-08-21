---
id: semantic-token-systems-colorblind-redundant-signaling
title: Pair every semantic color with a non-color signal
category: color-system
subcategory: accessibility
tags: [accessibility, colorblind, semantic-color, iconography]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Red-green confusion affects roughly 1 in 12 men and 1 in 200 women, which is
enough of a real user base that success-vs-danger cannot be conveyed by hue
alone anywhere in the product.

- Pair every status color with a distinct icon shape: a check for success, a
  triangle exclamation for warning, a circle-x or octagon for danger, an
  info "i" in a circle.
- Do not rely on icon color plus generic shape (e.g. all circles) as the only
  differentiator, vary the glyph inside the shape too.
- In data tables, add a text label or icon next to a colored status dot, a
  bare colored dot with no label is unreadable to a deuteranope.
- For success/danger pairs specifically, since they are the most common
  confusable pair, also vary lightness, not just hue, greens and reds at
  matched lightness are the hardest case for red-green colorblindness.

Why: semantic color is a convenience layer for the majority of users, not the
sole channel of information, and treating it as sufficient by itself excludes
a predictable, non-trivial fraction of any user base. Icon and shape
redundancy costs almost nothing at design time and removes the failure mode
entirely, it is one of the cheapest accessibility wins available in a token
system.

Example: a status column showing a filled circle with a check glyph in
success green next to the word "Active," and a circle with an x glyph in
danger red next to "Failed," so the glyph alone communicates status even in
grayscale.
Counter-example: a status column of plain colored dots, green for active, red
for failed, no glyph or label, indistinguishable to a colorblind user and
ambiguous even in a black-and-white screenshot.
