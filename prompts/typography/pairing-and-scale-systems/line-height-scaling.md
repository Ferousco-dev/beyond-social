---
id: pairing-and-scale-systems-line-height-scaling
title: Line-height must shrink as size grows
category: typography
subcategory: pairing-and-scale-systems
tags: [typography, scale, line-height, leading]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, marketing-site, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Line-height should shrink, in relative terms, as font size grows across the
scale; a fixed line-height multiplier applied uniformly leaves large headings
with visibly excessive leading and small text with cramped leading.

- Body text (14 to 18px): line-height 1.5 to 1.6.
- Subheadings (20 to 28px): line-height 1.3 to 1.4.
- Headlines (32 to 48px): line-height 1.15 to 1.25.
- Display or hero (56px and up): line-height 1.0 to 1.1, often needs manual
  per-line breaks at this size since auto-wrap can't be trusted to break at a
  good point.
- Track this as a paired value at every step of the modular scale, not a
  single global line-height applied everywhere and overridden ad hoc.

Why: at small sizes the eye needs extra vertical space between lines to track
back to the line start without losing its place, but at large sizes a single
line of text often fills the available width on its own, so the same relative
gap becomes excess whitespace that visually detaches the headline from the
content around it. Space that's necessary for reading physiology at 16px
becomes a design defect at 56px.

Example: 16px body at line-height 1.55; 44px headline at line-height 1.15,
with a manual line break before the last two words to control where it
wraps.

Counter-example: applying line-height 1.5 uniformly from a 12px caption up
through a 64px hero, leaving the hero with an ungainly gap between its
usually-single lines.
