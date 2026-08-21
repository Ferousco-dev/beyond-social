---
id: pairing-and-scale-systems-x-height-optical-matching
title: Matching x-height when pairing typefaces
category: typography
subcategory: pairing-and-scale-systems
tags: [typography, pairing, x-height, optical-sizing]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

When pairing two different typefaces, match their x-heights, or compensate the
size so they match, so the lowercase letters carry the same visual weight;
mismatched x-heights make one face look smaller even at identical point sizes.

- Compare lowercase "o" and "n" height between candidates at the same point
  size before committing to a pair.
- If the display face has a small x-height relative to cap height, common in
  didone and transitional serifs, bump the body face down 1-2px or the display
  face up 2-4px so neither dominates.
- Check cap-height alignment too; all-caps eyebrows should align optically with
  the x-height of adjacent lowercase headlines, not just share a baseline.
- Re-verify at both display and body sizes, since some optical-size variants
  shift x-height between weights.

Why: point size is a printer's convention, not a perceptual one. Two 16px faces
from different foundries can differ in apparent size by 10 to 15 percent
because of x-height, so matching purely on the font-size value produces pairs
that look accidentally unbalanced rather than deliberately hierarchical.

Example: "Canela Deck at 40px (x-height near 0.47em) paired with Inter at 17px
(x-height near 0.53em) to equalize apparent lowercase size."

Counter-example: setting both faces at an identical 40px/16px split by
convention alone, then wondering why the serif headline looks shrunken next to
the sans body.
