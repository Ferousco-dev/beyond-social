---
id: pairing-and-scale-systems-ratio-selection-by-tone
title: Choosing a scale ratio by brand tone
category: typography
subcategory: pairing-and-scale-systems
tags: [typography, scale, ratio, brand-tone]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

The numeric ratio driving a modular scale is a tone lever: tighter ratios read
restrained and technical, wider ratios read expressive and confident, so pick
the ratio to match brand tone before touching individual sizes.

- 1.125 (major second): dense, technical, financial or data products, many
  closely spaced levels.
- 1.2 (minor third): default for SaaS product UI, enough separation without
  drama.
- 1.25 (major third): marketing pages, blogs, editorial, visible hierarchy
  without shouting.
- 1.333 to 1.5 (perfect fourth to perfect fifth): landing pages and hero
  sections that need one or two loud display sizes.
- 1.618 (golden ratio): reserve for a single dramatic hero-to-body jump, not a
  full scale; it produces sizes too far apart to use for mid-level headings.

Why: the ratio compounds across every step of the scale, so a small change in
ratio produces a large change in how dramatic the largest heading feels
relative to body text. Swapping ratios is a faster way to shift a product's
felt personality than swapping typefaces, because it changes every relationship
in the system at once instead of just the letterforms.

Example: a finance dashboard scale at 1.125 runs 13, 14.6, 16, 18, 20.25px; a
DTC landing page at 1.5 runs 16, 24, 36, 54, 81px.

Counter-example: using a 1.618 ratio for a five-level dashboard scale,
producing a jump from a 40px section header straight to a 65px page title with
nothing usable in between.
