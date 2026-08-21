---
id: scanning-patterns-f-pattern-z-pattern-repeating-cta-at-each-scroll-terminus
title: Repeating the CTA at each scroll section's terminus
category: visual-hierarchy
subcategory: scanning-patterns
tags: [cta-placement, scroll-depth, conversion, layout]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, marketing-site, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A long scrolling page isn't one scan pattern, it's a chain of them, one Z or F
per viewport. A single CTA placed once at the literal bottom of the page will
only be seen by the fraction of visitors who scroll that far, and most bail
before then.

The recipe:

- Break the page into sections roughly one viewport's height each.
- End each section on its own terminal point (bottom-right for a Z-styled
  section, the end of the last F-row for a text section) with a CTA.
- Vary the CTA copy per section to answer the specific objection that section
  just addressed, instead of repeating one generic line.
- Reserve the highest-contrast CTA treatment for the final terminus; it's the
  one seen after the reader is already convinced.

Why: scan patterns reset at each viewport because the reader can't see what's
below the fold, so F, Z, and Gutenberg all restart within the visible frame.
Repeating the ask at each frame's natural resting point converts readers who
bail at any depth, not only the ones who reach the literal end of the page.

Example: a features section ending "See it in your workflow →" rather than a
generic "Sign up" repeated four times down the page.
Counter-example: one "Get started" button placed only after the pricing table
at the very bottom of a six-screen page. Anyone who scans the first three
sections and forms an opinion never sees an ask.
