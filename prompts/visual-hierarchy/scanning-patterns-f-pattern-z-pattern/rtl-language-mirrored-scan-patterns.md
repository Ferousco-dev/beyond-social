---
id: scanning-patterns-f-pattern-z-pattern-rtl-language-mirrored-scan-patterns
title: RTL scripts mirror the F- and Z-pattern horizontally
category: visual-hierarchy
subcategory: scanning-patterns
tags: [rtl, localization, reading-direction, layout-mirroring]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, marketing-site, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

F- and Z-pattern research is documented on left-to-right scripts (English,
most Latin and Cyrillic languages). For right-to-left scripts (Arabic,
Hebrew) the entire pattern mirrors horizontally, starting top-right and
terminating bottom-left, because reading direction is the mechanism driving
the pattern, not an incidental detail.

The recipe:

- For RTL layouts, place the logo top-right and the primary nav CTA top-left,
  the literal mirror of the LTR nav-bar guidance.
- Move the terminal-point CTA (hero, pricing card, article end) to the
  bottom-left for RTL locales, not bottom-right.
- Mirror the entire layout, not just text alignment; an RTL page with mirrored
  text but an unmirrored image or CTA layout puts the pattern's terminus where
  the scan doesn't naturally arrive.
- Validate with native RTL readers or eye-tracking data specific to that
  script; don't assume the mirror is exact for scripts with different
  character density or a vertical writing direction.

Why: the scan pattern is a byproduct of how the reading system trains eye
movement over years of practice. A script that reads right-to-left trains the
opposite default sweep direction, so layout guidance derived from LTR
eye-tracking studies inverts, it doesn't just disappear, for RTL audiences.

Example: an Arabic-language landing page with the logo top-right and the
"ابدأ الآن" (start now) CTA bottom-left.
Counter-example: shipping an RTL locale by only flipping text direction
(dir="rtl") while leaving the hero image and CTA button in their LTR
left/right positions. The copy reads right to left but the visual hierarchy
still assumes a left-to-right scan.
