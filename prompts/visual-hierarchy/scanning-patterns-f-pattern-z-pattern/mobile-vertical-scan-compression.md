---
id: scanning-patterns-f-pattern-z-pattern-mobile-vertical-scan-compression
title: Mobile compresses F and Z into a vertical scan
category: visual-hierarchy
subcategory: scanning-patterns
tags: [mobile, viewport, vertical-scan, responsive-layout]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [landing-page, mobile-app, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

On a phone viewport the classic F- and Z-patterns compress into an almost
entirely vertical scan. There isn't enough horizontal width for a meaningful
left-to-right sweep, so the practical pattern on mobile is closer to a single
downward column with brief left-edge sampling than a true F or Z.

The recipe:

- Stack the value proposition, supporting proof, and CTA in strict vertical
  order of priority; horizontal placement carries far less signal on a
  375-428px viewport than it does on desktop.
- Don't rely on a Z-pattern's top-right terminal placement for a secondary
  action on mobile; that corner gets scanned but sits outside comfortable
  thumb reach and rarely gets acted on.
- Repeat the primary CTA at intervals as the vertical scan continues, since
  mobile scanning is functionally endless scroll, not a bounded frame.
- Keep line length short, 35-45 characters, so even the compressed horizontal
  sweep completes fully instead of trailing off, preserving some F-pattern-
  style row scanning within the narrow column.

Why: F and Z were both documented on desktop-width viewports where a genuine
horizontal sweep is possible. Applying the same guidance unadjusted to a
narrow column mispredicts what actually gets seen, because the geometry the
pattern depends on no longer exists at that width.

Example: value prop, then one supporting stat, then a CTA button, all
full-width and vertically stacked in that order.
Counter-example: a mobile hero with the CTA link in the top-right corner,
mirroring a desktop Z-pattern. On a phone that corner sits outside comfortable
thumb reach and outside the vertical scan's real path.
