---
id: type-scale-modular
title: Modular type scale
category: typography
tags: [typography, scale, rhythm]
applicability:
  platforms: [web, mobile]
  productTypes: []
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Pick a base size and a ratio, then take every size from that scale. A base of
16px with a ratio around 1.2 (minor third) suits dense product UI; 1.25 (major
third) suits marketing pages that want more drama. Never hand-pick arbitrary
sizes; the scale is what makes type feel systematic.

Pair the size scale with a line-height scale: tighter for headings (about 1.1 to
1.25), looser for body (about 1.5). Cap body line length near 60 to 75 characters
for readability. Use weight, not just size, to separate levels, and limit
yourself to two or three weights.

Why: a consistent ratio produces harmonic size relationships the eye reads as
intentional. Ad hoc sizes create subtle misalignment that reads as sloppy even
when nothing is obviously wrong.

Example: 12, 14, 16, 20, 24, 30, 38 from a 1.25 ratio, body at 1.5 line-height,
measure capped at 68ch. Counter-example: 15, 17, 22, 23, 41 chosen by eye with a
single 1.4 line-height applied to everything.
