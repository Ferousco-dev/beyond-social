---
id: buttons-and-ctas-label-padding-truncation
title: Button padding and label truncation
category: component
subcategory: buttons-and-ctas
tags: [buttons, spacing, typography, layout]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Button padding should scale with font size, not sit at a fixed pixel value —
and a button's width should be allowed to grow with its label rather than
truncating or wrapping text the user needs to read in full.

The recipe:

- Set horizontal padding at roughly 2-2.5x the font size and vertical padding
  at roughly 0.6-0.8x, so a 14px label gets about 28-35px horizontal and
  8-11px vertical padding. This keeps proportions consistent across a type
  scale instead of every button looking cramped or bloated relative to its text.
- Never truncate button labels with an ellipsis — if the label doesn't fit,
  the button is either mis-sized or the copy needs shortening at the source,
  not at render time.
- Avoid text-wrap inside buttons; a two-line button reads as broken layout.
  Give the container enough width or shorten the label.
- Keep icon-plus-label buttons' icon gap consistent (typically 6-8px) and
  match icon optical size to cap-height, not em-square size, since most icon
  sets render slightly larger than surrounding text at the same pixel size.
- Maintain consistent height across a button group even when labels differ in
  length — pad the shorter labels rather than letting each button's height
  float with its content.

Why: padding proportional to type size is what makes a button "feel" like a
button rather than a link with a background color — it's the same reason a
book's margins scale with its trim size. Truncated or wrapped labels also
break the promise made in the CTA-copy pattern: a clear, specific label that
gets cut off mid-word undermines the specificity it was written for.

Example: a 14px "Add to cart" button with 30px horizontal / 10px vertical
padding, fixed height matched across a row of same-tier buttons.

Counter-example: a fixed 120px-wide button that truncates "Continue to
checkout" into "Continue to che…", forcing the user to guess the rest.
