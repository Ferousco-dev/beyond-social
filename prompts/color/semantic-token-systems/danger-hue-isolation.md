---
id: semantic-token-systems-danger-hue-isolation
title: Keep danger red out of the brand accent's hue range
category: color-system
subcategory: hue-mapping
tags: [danger, red, hue-collision, semantic-color]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Danger should sit in a hue range no other role in the palette touches, roughly
0-10 degrees on the hue wheel (true red, not orange-red or pink-red), so a
delete button is never one shade away from something decorative.

- Reserve pure red (hue ~0-10) exclusively for danger and destructive actions.
- If the brand accent is itself red or coral, shift danger toward a cooler,
  more saturated red and pull the brand accent slightly warmer or cooler so
  the two no longer overlap within a 15-degree band.
- Never use red for anything non-destructive: not a "hot" badge, not a
  trending indicator, not a brand highlight.
- Check the danger swatch against every other swatch in the palette at a
  glance; if any two are indistinguishable at small icon size, adjust hue, not
  just lightness.

Why: users build a fast, semi-conscious association between red and "this
action is destructive or broken." Every non-destructive use of red spends down
that association, and once a user has clicked a red "trending" badge expecting
nothing bad to happen, the next actual delete button gets a fraction less
hesitation. Isolating the hue keeps the danger signal's reliability intact
across the whole product, not just within one screen.

Example: brand accent at `#0066FF` (blue, hue ~217), danger at `#DC2626` (red,
hue ~0); the two are nowhere near each other on the wheel, so danger reads
instantly and unambiguously.
Counter-example: a coral brand accent at `#FF5A4E` paired with a danger red at
`#EF4444`, twelve degrees apart, so error states and brand-colored marketing
badges become visually interchangeable at a glance.
